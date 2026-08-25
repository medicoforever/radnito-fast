import React, { useState, useEffect } from 'react';
import Spinner from './ui/Spinner';
import SparklesIcon from './icons/SparklesIcon';
import TemplateSelectionModal, { SelectedTemplateData } from './ui/TemplateSelectionModal';
import TemplateSelectorBanner from './ui/TemplateSelectorBanner';
import CustomPromptInput from './ui/CustomPromptInput';
import WordEditorCanvas from './editor/WordEditorCanvas';
import { fastMergeWithTemplate } from '../services/fastMergeService';
import {
  getUserTemplates,
  UserTemplate,
  isTemplateSkillEnabled,
  isConsultantStyleEnabled,
  getTemplateCustomPrompt,
} from '../services/templateStorage';

interface MergeTemplateProcessorProps {
  selectedModel: string;
  initialTemplate?: SelectedTemplateData | null;
  selectedTemplate?: SelectedTemplateData | null;
  onOpenTemplateModal?: () => void;
  onSelectTemplate?: (tmpl: SelectedTemplateData) => void;
  onBack?: () => void;
}

export const MergeTemplateProcessor: React.FC<MergeTemplateProcessorProps> = ({
  selectedModel,
  initialTemplate,
  selectedTemplate: selectedTemplateProp,
  onOpenTemplateModal,
  onSelectTemplate,
  onBack,
}) => {
  const [activeTemplate, setActiveTemplate] = useState<SelectedTemplateData | null>(
    selectedTemplateProp || initialTemplate || null
  );
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [customTemplates, setCustomTemplates] = useState<UserTemplate[]>([]);

  const [findingsInput, setFindingsInput] = useState<string>('');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Live Word Editor State
  const [editorHtml, setEditorHtml] = useState<string | null>(null);
  const [reportTitle, setReportTitle] = useState<string>('Radiology Report');

  // Consultant Style & Skill States
  const [isConsultantStyleActive, setIsConsultantStyleActive] = useState<boolean>(() => isConsultantStyleEnabled());
  const [isSkillEnabled, setIsSkillEnabled] = useState<boolean>(() => isTemplateSkillEnabled());
  const [customSkillPrompt, setCustomSkillPrompt] = useState<string>('');

  // Sync prop changes
  useEffect(() => {
    if (selectedTemplateProp) {
      setActiveTemplate(selectedTemplateProp);
    } else if (initialTemplate && !activeTemplate) {
      setActiveTemplate(initialTemplate);
    }
  }, [selectedTemplateProp, initialTemplate]);

  // Sync active template skill prompt
  useEffect(() => {
    if (activeTemplate?.id) {
      const storedOverride = getTemplateCustomPrompt(activeTemplate.id);
      setCustomSkillPrompt(storedOverride || activeTemplate.skillPrompt || '');
      setReportTitle(activeTemplate.name || 'Radiology Report');
    } else {
      setCustomSkillPrompt('');
    }
  }, [activeTemplate?.id, activeTemplate?.skillPrompt, activeTemplate?.name]);

  // Load custom templates
  useEffect(() => {
    getUserTemplates().then(list => setCustomTemplates(list)).catch(() => {});
  }, []);

  const refreshCustomTemplates = async () => {
    try {
      const list = await getUserTemplates();
      setCustomTemplates(list);
    } catch {}
  };

  const handleOpenModal = () => {
    if (onOpenTemplateModal) {
      onOpenTemplateModal();
    }
    setIsTemplateModalOpen(true);
  };

  const handleTemplateChosen = (tmpl: SelectedTemplateData) => {
    setActiveTemplate(tmpl);
    if (onSelectTemplate) {
      onSelectTemplate(tmpl);
    }
    setIsTemplateModalOpen(false);
    setError(null);
  };

  const handleScrollToMainPlace = () => {
    const el = document.getElementById('merge-dictation-main-top');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNewDictationAndMoveTop = () => {
    setFindingsInput('');
    setEditorHtml(null);
    setError(null);
    handleScrollToMainPlace();
  };

  const handleMerge = async () => {
    if (!activeTemplate) {
      setError('Please select a report template first.');
      setIsTemplateModalOpen(true);
      return;
    }
    if (!findingsInput.trim()) {
      setError('Please enter or paste your radiology findings.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await fastMergeWithTemplate(
        findingsInput.trim(),
        activeTemplate,
        selectedModel,
        customNotes.trim() || undefined,
        null,
        isSkillEnabled,
        customSkillPrompt.trim() || undefined,
        isConsultantStyleActive
      );

      setEditorHtml(result.html);
      setReportTitle(result.title);
    } catch (err: any) {
      console.error('Merge error:', err);
      setError(err?.message || 'Failed to merge findings into template.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="merge-dictation-main-top" className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 sm:p-7 rounded-3xl text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-extrabold tracking-wider uppercase backdrop-blur-xs">
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>Fast AI Merge & Word Editor</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Merge Findings into Template
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl">
            Select any CT/MRI template, dictate or paste findings, and review your live Word report with interactive formatting tools.
          </p>
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-xl transition-all"
          >
            &larr; Back to Workspace
          </button>
        )}
      </div>

      {/* Main Template Banner */}
      <TemplateSelectorBanner
        selectedTemplate={activeTemplate}
        onOpenModal={() => setIsTemplateModalOpen(true)}
        onClearTemplate={() => setActiveTemplate(null)}
        onSelectTemplate={tmpl => setActiveTemplate(tmpl)}
      />

      {/* Main Input Section */}
      {!editorHtml ? (
        <div className="bg-white dark:bg-slate-800 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label
                htmlFor="merge-findings-input"
                className="text-sm font-bold text-slate-800 dark:text-slate-200"
              >
                Paste or Type Your Findings / Clinical Notes:
              </label>
              <span className="text-xs text-slate-400">
                Type raw notes, voice transcript, or bullet points
              </span>
            </div>
            <textarea
              id="merge-findings-input"
              rows={8}
              value={findingsInput}
              onChange={e => setFindingsInput(e.target.value)}
              placeholder="e.g. Brain: Normal ventricles and sulci. Small acute lacunar infarct in left internal capsule posterior limb showing diffusion restriction. No acute intracranial hemorrhage or midline shift. Impression: Acute lacunar infarct in left internal capsule."
              className="w-full p-3.5 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none font-sans leading-relaxed"
            />
          </div>

          {/* Quick Presets / Shortcuts */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-slate-400 dark:text-slate-500">Quick Text:</span>
            {[
              { label: 'Normal Study', text: 'Scan is completely normal. No acute focal abnormality.' },
              { label: 'Mild Spondylosis', text: 'Spine: Mild degenerative disc dessication with minor diffuse bulge. No significant canal or neural foraminal stenosis.' },
              { label: 'Acute Infarct', text: 'Brain: Acute non-hemorrhagic infarct with diffusion restriction. No mass effect or midline shift.' },
              { label: 'Sinusitis', text: 'PNS: Mucosal thickening noted in bilateral maxillary sinuses. Normal ostiomeatal complexes.' },
            ].map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setFindingsInput(prev => prev ? `${prev}\n${preset.text}` : preset.text)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 font-semibold transition-colors"
              >
                + {preset.label}
              </button>
            ))}
          </div>

          {/* Global Custom Instructions & Doctor Preferences */}
          <div className="pt-2">
            <CustomPromptInput
              value={customNotes}
              onChange={setCustomNotes}
              label="Doctor Preference Notes (Optional):"
              placeholder="e.g. 'Always mention visualized thoracic inlet', 'Format as short paragraphs'..."
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-300 font-semibold">
              {error}
            </div>
          )}

          <button
            onClick={handleMerge}
            disabled={isProcessing || !findingsInput.trim()}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm sm:text-base shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Spinner className="w-5 h-5 text-white" />
                <span>Integrating findings into live Word editor...</span>
              </>
            ) : (
              <>
                <SparklesIcon className="w-5 h-5" />
                <span>Merge Findings into Template & Open Live Word Editor</span>
              </>
            )}
          </button>
        </div>
      ) : (
        /* Live Word Editor Canvas View */
        <div className="space-y-6 animate-fade-in">
          <WordEditorCanvas
            initialHtml={editorHtml}
            reportTitle={reportTitle}
            onChange={html => setEditorHtml(html)}
            onNewDictation={handleNewDictationAndMoveTop}
          />
        </div>
      )}

      {/* Floating Move to Main Place Button */}
      {editorHtml && (
        <button
          type="button"
          onClick={handleScrollToMainPlace}
          className="fixed bottom-6 right-6 z-40 p-3 px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-2xl border-2 border-white dark:border-slate-800 transition-all flex items-center gap-2 text-xs font-extrabold hover:scale-105"
          title="Move to Main Place / Top"
        >
          <span className="text-base leading-none font-black">⬆</span>
          <span className="tracking-wide">Main Place</span>
        </button>
      )}

      <TemplateSelectionModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelectTemplate={handleTemplateChosen}
        selectedTemplateId={activeTemplate?.id}
        customTemplates={customTemplates}
        onRefreshCustomTemplates={refreshCustomTemplates}
      />
    </div>
  );
};

export default MergeTemplateProcessor;

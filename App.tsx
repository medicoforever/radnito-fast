import React, { useState, useEffect } from 'react';
import { AppStatus } from './types';
import { BatchProcessor } from './components/BatchProcessor';
import MergeTemplateProcessor from './components/MergeTemplateProcessor';
import SunIcon from './components/icons/SunIcon';
import MoonIcon from './components/icons/MoonIcon';
import { generateRadnitoPDF } from './services/pdfGenerator';
import { isRAGStyleMatchingEnabled, setRAGStyleMatchingEnabled } from './services/reportStyleRAG';
import TemplateSelectorBanner from './components/ui/TemplateSelectorBanner';
import TemplateSelectionModal, { SelectedTemplateData } from './components/ui/TemplateSelectionModal';
import { getUserTemplates, UserTemplate } from './services/templateStorage';
import { clearAllApiKeys } from './services/apiKeyStore';

const ERROR_CHECK_ENABLED_KEY = 'radiologyErrorCheckEnabled';

const App: React.FC = () => {
  const [mode, setMode] = useState<'batch' | 'merge_template'>('batch');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.1-pro-preview');
  const [isRAGEnabled, setIsRAGEnabled] = useState<boolean>(() => isRAGStyleMatchingEnabled());

  // Template State
  const [selectedTemplate, setSelectedTemplate] = useState<SelectedTemplateData | null>(null);
  const [autoDownloadDocx, setAutoDownloadDocx] = useState<boolean>(true);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [customTemplates, setCustomTemplates] = useState<UserTemplate[]>([]);

  useEffect(() => {
    // Clear any previously stored local API keys so environment key is used automatically
    clearAllApiKeys();
    getUserTemplates().then(tmpls => setCustomTemplates(tmpls)).catch(() => {});
  }, []);

  const refreshCustomTemplates = async () => {
    try {
      const tmpls = await getUserTemplates();
      setCustomTemplates(tmpls);
    } catch (e) {
      console.warn('Failed to fetch user templates:', e);
    }
  };

  const [theme, setTheme] = useState(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      return storedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [isErrorCheckEnabled, setIsErrorCheckEnabled] = useState(() => {
    const saved = localStorage.getItem(ERROR_CHECK_ENABLED_KEY);
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);
  
  useEffect(() => {
    localStorage.setItem(ERROR_CHECK_ENABLED_KEY, JSON.stringify(isErrorCheckEnabled));
  }, [isErrorCheckEnabled]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 font-sans transition-colors duration-300">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-6 relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 shadow-sm">
                ⚡ RADNITO AI Powered
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={generateRadnitoPDF}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-xl shadow text-xs flex items-center space-x-1 transition-all"
                title="Download complete RADNITO PDF guide"
              >
                <span>📄 PDF Guide</span>
              </button>

              <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-blue-700 dark:text-blue-400 drop-shadow-sm flex items-center justify-center gap-2">
            <span>RADNITO</span>
            <span className="text-sm sm:text-base font-extrabold uppercase px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl shadow-xs">FAST</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm sm:text-base font-medium">
            Transcribe and process multiple radiology audio dictations concurrently in bulk with 600+ standard templates and DOCX merge.
          </p>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mt-4 p-1.5 bg-slate-200/60 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setMode('batch')}
              className={`px-5 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all relative ${
                mode === 'batch'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              📂 Batch Dictation Workspace
            </button>
            <button
              onClick={() => setMode('merge_template')}
              className={`px-5 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all relative ${
                mode === 'merge_template'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              📑 Merge Findings to Template
            </button>
          </div>

          <div className="mt-4 flex flex-wrap justify-center items-center gap-x-6 gap-y-2">
            {mode === 'batch' && (
              <div className="flex items-center gap-2">
                <label htmlFor="model-select" className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                  AI Model:
                </label>
                <select 
                  id="model-select"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-medium rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 dark:bg-slate-700 dark:border-slate-600 dark:placeholder-slate-400 dark:text-white shadow-sm"
                >
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Default)</option>
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                  <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
                  <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                  <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite</option>
                </select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <label htmlFor="error-check-toggle" className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                Automatic Error Finding
              </label>
              <button
                onClick={() => setIsErrorCheckEnabled(!isErrorCheckEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                  isErrorCheckEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-600'
                }`}
                role="switch"
                aria-checked={isErrorCheckEnabled}
                id="error-check-toggle"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isErrorCheckEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </header>

        {mode === 'batch' && (
          <TemplateSelectorBanner
            selectedTemplate={selectedTemplate}
            onOpenModal={() => setIsTemplateModalOpen(true)}
            onClearTemplate={() => setSelectedTemplate(null)}
            autoDownloadDocx={autoDownloadDocx}
            onToggleAutoDownloadDocx={() => setAutoDownloadDocx(prev => !prev)}
          />
        )}

        <main className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 sm:p-8 min-h-[350px]">
          {mode === 'batch' ? (
            <BatchProcessor 
              selectedModel={selectedModel} 
              isErrorCheckEnabled={isErrorCheckEnabled}
              selectedTemplate={selectedTemplate}
              autoDownloadDocx={autoDownloadDocx}
              onBack={() => setMode('batch')} 
            />
          ) : (
            <MergeTemplateProcessor
              selectedModel={selectedModel}
              initialTemplate={selectedTemplate}
              onSelectTemplate={(tmpl) => setSelectedTemplate(tmpl)}
              onBack={() => setMode('batch')}
            />
          )}
        </main>

        <footer className="text-center mt-8 text-xs text-slate-500 dark:text-slate-500 space-y-1">
          <p className="font-bold text-slate-700 dark:text-slate-300">RADNITO • Batch Radiology Dictation</p>
          <p>Powered by Gemini AI</p>
        </footer>

        <TemplateSelectionModal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          onSelectTemplate={(tmpl) => setSelectedTemplate(tmpl)}
          selectedTemplateId={selectedTemplate?.id}
          customTemplates={customTemplates}
          onRefreshCustomTemplates={refreshCustomTemplates}
        />
      </div>
    </div>
  );
};

export default App;

import React, { useState, useEffect, useRef } from 'react';
import ChevronDownIcon from '../icons/ChevronDownIcon';
import SparklesIcon from '../icons/SparklesIcon';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { transcribeAudioForPrompt, blobToBase64 } from '../../services/geminiService';
import MicIcon from '../icons/MicIcon';
import StopIcon from '../icons/StopIcon';
import ImageIcon from '../icons/ImageIcon';
import CloseIcon from '../icons/CloseIcon';
import Spinner from './Spinner';

export interface StyleToggles {
  telegraphic: boolean;
  boldAbnormalities: boolean;
  radsAutoCompute: boolean;
  compactImpression: boolean;
}

export interface CustomPromptInputProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  className?: string;
  isLiveMode?: boolean;
  styleToggles?: StyleToggles;
  onStyleTogglesChange?: (toggles: StyleToggles) => void;
  images?: Array<{ data: string; mimeType: string }>;
  onImagesChange?: (images: Array<{ data: string; mimeType: string }>) => void;
}

export const DEFAULT_STYLE_TOGGLES: StyleToggles = Object.freeze({
  telegraphic: true,
  boldAbnormalities: true,
  radsAutoCompute: true,
  compactImpression: true,
});

const MAX_CUSTOM_RULES_LENGTH = 5000;

export function sanitizeRuleInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<img[^>]*onerror=[^>]*>/gi, '')
    .replace(/<svg[^>]*onload=[^>]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const CustomPromptInput: React.FC<CustomPromptInputProps> = ({
  prompt,
  onPromptChange,
  className = '',
  isLiveMode = false,
  styleToggles,
  onStyleTogglesChange,
  images = [],
  onImagesChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isRecording, startRecording, stopRecording, error: recorderError } = useAudioRecorder();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Local style toggles state with stable default
  const [localToggles, setLocalToggles] = useState<StyleToggles>(() => styleToggles || DEFAULT_STYLE_TOGGLES);

  useEffect(() => {
    if (styleToggles) {
      setLocalToggles(prev => {
        if (
          prev.telegraphic === styleToggles.telegraphic &&
          prev.boldAbnormalities === styleToggles.boldAbnormalities &&
          prev.radsAutoCompute === styleToggles.radsAutoCompute &&
          prev.compactImpression === styleToggles.compactImpression
        ) {
          return prev;
        }
        return styleToggles;
      });
    }
  }, [
    styleToggles?.telegraphic,
    styleToggles?.boldAbnormalities,
    styleToggles?.radsAutoCompute,
    styleToggles?.compactImpression,
  ]);

  const handleToggleChange = (key: keyof StyleToggles) => {
    const updated = {
      ...localToggles,
      [key]: !localToggles[key],
    };
    setLocalToggles(updated);
    if (onStyleTogglesChange) {
      onStyleTogglesChange(updated);
    }
  };

  const handleMicClick = async () => {
    setTranscriptionError(null);
    if (isRecording) {
      setIsTranscribing(true);
      try {
        const audioBlob = await stopRecording();
        if (audioBlob && audioBlob.size > 0) {
          const transcript = await transcribeAudioForPrompt(audioBlob);
          const newPrompt = prompt ? `${prompt} ${transcript}` : transcript;
          onPromptChange(newPrompt.slice(0, MAX_CUSTOM_RULES_LENGTH));
        }
      } catch (err) {
        setTranscriptionError(err instanceof Error ? err.message : 'An unknown error occurred during transcription.');
      } finally {
        setIsTranscribing(false);
      }
    } else {
      await startRecording();
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onImagesChange || !e.target.files) return;
    const files = Array.from(e.target.files);
    try {
      const newImages = await Promise.all(
        files.map(async file => {
          const base64 = await blobToBase64(file);
          return { data: base64, mimeType: file.type || 'image/jpeg' };
        })
      );
      onImagesChange([...images, ...newImages]);
    } catch (err) {
      console.warn('Failed to load reference image:', err);
    }
    if (e.target) e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    if (onImagesChange) {
      onImagesChange(images.filter((_, i) => i !== index));
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Hidden file input for images */}
      {onImagesChange && (
        <input
          type="file"
          ref={imageInputRef}
          onChange={handleImageFileChange}
          accept="image/*"
          multiple
          className="hidden"
        />
      )}

      {/* Main Header / Trigger Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Global Custom Instructions & Doctor Preferences
                </h3>
                {prompt && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                    Active ({prompt.length} chars)
                  </span>
                )}
                {images.length > 0 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300">
                    {images.length} {images.length === 1 ? 'image' : 'images'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {prompt ? `${prompt.slice(0, 70)}...` : 'Add optional doctor phrasing rules, specific measurements, or custom style instructions'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ChevronDownIcon
              className={`w-5 h-5 text-slate-400 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>

        {/* Collapsible Content */}
        {isOpen && (
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 space-y-4 animate-fade-in">
            {/* Style Toggles Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {[
                { key: 'boldAbnormalities' as const, label: 'Bold Abnormalities', desc: 'Prefix with BOLD::' },
                { key: 'radsAutoCompute' as const, label: 'Standard RADS', desc: 'BI/PI/TI/Lung-RADS' },
                { key: 'telegraphic' as const, label: 'Concise Tone', desc: 'Consultant shorthand' },
                { key: 'compactImpression' as const, label: 'Numbered Impression', desc: 'Prioritized hierarchy' },
              ].map(item => (
                <label
                  key={item.key}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2 ${
                    localToggles[item.key]
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={localToggles[item.key]}
                    onChange={() => handleToggleChange(item.key)}
                    className="w-3.5 h-3.5 mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[10px] text-slate-400">{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Custom Rules Textarea */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Doctor Preferences & Phrasing Instructions:
                </label>
                <span className="text-[10px] text-slate-400">
                  {prompt.length} / {MAX_CUSTOM_RULES_LENGTH} chars
                </span>
              </div>
              <div className="relative">
                <textarea
                  rows={4}
                  value={prompt}
                  onChange={e => onPromptChange(e.target.value.slice(0, MAX_CUSTOM_RULES_LENGTH))}
                  placeholder="e.g. 'Always report measurements in mm', 'Include clinical correlation note in impression', 'Use bulleted points for pelvic findings'..."
                  className="w-full p-3 pr-24 text-xs font-mono border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                  {onImagesChange && (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="p-2 rounded-full text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      title="Attach reference image / previous report photo"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleMicClick}
                    disabled={isTranscribing}
                    className={`p-2 rounded-full text-white transition-colors disabled:opacity-50 ${
                      isRecording ? 'bg-red-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                    title={isRecording ? 'Stop Recording' : 'Dictate instructions'}
                  >
                    {isTranscribing ? (
                      <Spinner className="w-4 h-4 text-white" />
                    ) : isRecording ? (
                      <StopIcon className="w-4 h-4" />
                    ) : (
                      <MicIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              {(recorderError || transcriptionError) && (
                <p className="text-xs text-red-500 mt-1">{recorderError || transcriptionError}</p>
              )}

              {/* Image Previews */}
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600">
                      <img
                        src={`data:${img.mimeType};base64,${img.data}`}
                        alt={`Reference ${idx + 1}`}
                        className="w-14 h-14 object-cover"
                      />
                      {onImagesChange && (
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove image"
                        >
                          <CloseIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomPromptInput;

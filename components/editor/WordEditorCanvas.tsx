import React, { useRef, useEffect, useState } from 'react';
import SparklesIcon from '../icons/SparklesIcon';
import CopyIcon from '../icons/CopyIcon';
import DownloadIcon from '../icons/DownloadIcon';

interface WordEditorCanvasProps {
  initialHtml?: string;
  onChange?: (html: string) => void;
  reportTitle?: string;
  onNewDictation?: () => void;
  readOnly?: boolean;
}

export const WordEditorCanvas: React.FC<WordEditorCanvasProps> = ({
  initialHtml = '',
  onChange,
  reportTitle = 'Radiology Report',
  onNewDictation,
  readOnly = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [copySuccessNotice, setCopySuccessNotice] = useState<string | null>(null);

  // Sync incoming HTML changes to editor canvas
  useEffect(() => {
    if (editorRef.current && initialHtml) {
      if (editorRef.current.innerHTML !== initialHtml) {
        editorRef.current.innerHTML = initialHtml;
      }
    }
  }, [initialHtml]);

  const handleInput = () => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      handleInput();
    }
  };

  const handleCopyForPacs = async () => {
    if (!editorRef.current) return;
    const htmlContent = editorRef.current.innerHTML;
    const plainText = editorRef.current.innerText;

    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': textBlob,
            'text/html': htmlBlob,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
      setIsCopied(true);
      setCopySuccessNotice('✓ Formatted Report copied! Paste (Ctrl+V) directly into PACS / RIS / Word.');
      setTimeout(() => {
        setIsCopied(false);
        setCopySuccessNotice(null);
      }, 3500);
    } catch (err) {
      console.warn('Fallback to writeText:', err);
      await navigator.clipboard.writeText(plainText);
      setIsCopied(true);
      setCopySuccessNotice('✓ Plain text copied to clipboard!');
      setTimeout(() => {
        setIsCopied(false);
        setCopySuccessNotice(null);
      }, 3000);
    }
  };

  const handleDownloadDocx = () => {
    if (!editorRef.current) return;
    const contentHtml = editorRef.current.innerHTML;
    const title = reportTitle || 'Radiology_Report';
    const cleanFileName = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.docx`;

    // Standard HTML-to-Word XML wrapper
    const docxContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${title}</title>
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.35; color: #111827; }
          h1, h2, h3, h4 { color: #0f172a; margin-top: 14pt; margin-bottom: 4pt; font-weight: bold; }
          h1 { font-size: 14pt; text-align: center; text-decoration: underline; }
          p { margin-top: 0; margin-bottom: 6pt; }
          ul, ol { margin-top: 0; margin-bottom: 8pt; padding-left: 20pt; }
          li { margin-bottom: 3pt; }
          strong, b { font-weight: bold; }
          .impression-box { margin-top: 14pt; padding-top: 6pt; border-top: 1pt solid #cbd5e1; }
        </style>
      </head>
      <body>
        ${contentHtml}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', docxContent], {
      type: 'application/msword;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full flex flex-col items-center space-y-4">
      {/* Top Word Toolbar */}
      <div className="w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-3 flex flex-wrap items-center justify-between gap-2.5 sticky top-2 z-30 backdrop-blur-md bg-white/95 dark:bg-slate-800/95">
        {/* Formatting Actions */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => execCmd('bold')}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs w-8 h-8 flex items-center justify-center border border-slate-200 dark:border-slate-600 shadow-2xs"
            title="Bold (Ctrl+B)"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => execCmd('italic')}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 italic font-serif text-xs w-8 h-8 flex items-center justify-center border border-slate-200 dark:border-slate-600 shadow-2xs"
            title="Italic (Ctrl+I)"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => execCmd('underline')}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 underline text-xs w-8 h-8 flex items-center justify-center border border-slate-200 dark:border-slate-600 shadow-2xs"
            title="Underline (Ctrl+U)"
          >
            U
          </button>
          <button
            type="button"
            onClick={() => execCmd('strikeThrough')}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 line-through text-xs w-8 h-8 flex items-center justify-center border border-slate-200 dark:border-slate-600 shadow-2xs"
            title="Strikethrough"
          >
            S
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          <button
            type="button"
            onClick={() => execCmd('insertUnorderedList')}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs flex items-center justify-center border border-slate-200 dark:border-slate-600 shadow-2xs gap-1 px-2.5"
            title="Bullet List"
          >
            <span>• List</span>
          </button>
          <button
            type="button"
            onClick={() => execCmd('insertOrderedList')}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs flex items-center justify-center border border-slate-200 dark:border-slate-600 shadow-2xs gap-1 px-2.5"
            title="Numbered List"
          >
            <span>1. List</span>
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          <button
            type="button"
            onClick={() => execCmd('formatBlock', '<h3>')}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs flex items-center justify-center border border-slate-200 dark:border-slate-600 shadow-2xs font-bold px-2.5"
            title="Heading"
          >
            <span>H3</span>
          </button>
          <button
            type="button"
            onClick={() => execCmd('formatBlock', '<p>')}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs flex items-center justify-center border border-slate-200 dark:border-slate-600 shadow-2xs px-2.5"
            title="Normal Paragraph"
          >
            <span>Normal</span>
          </button>
          <button
            type="button"
            onClick={() => execCmd('removeFormat')}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs flex items-center justify-center border border-slate-200 dark:border-slate-600 shadow-2xs px-2"
            title="Clear Formatting"
          >
            <span>✕ Clear</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopyForPacs}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
            title="Copy with full formatting for PACS / RIS / Word"
          >
            <CopyIcon className="w-4 h-4" />
            <span>{isCopied ? 'Copied!' : '📋 Copy for PACS / RIS'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadDocx}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            title="Export to Word Document (.docx)"
          >
            <DownloadIcon className="w-4 h-4" />
            <span>Word (.docx)</span>
          </button>
          {onNewDictation && (
            <button
              type="button"
              onClick={onNewDictation}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all flex items-center gap-1 border border-slate-200 dark:border-slate-600"
              title="Clear and start new dictation"
            >
              <span>+ Next Dictation</span>
            </button>
          )}
        </div>
      </div>

      {copySuccessNotice && (
        <div className="w-full p-2.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-xl text-center animate-fade-in shadow-xs">
          {copySuccessNotice}
        </div>
      )}

      {/* Sandboxed Word Canvas Page */}
      <div className="w-full max-w-4xl bg-slate-100 dark:bg-slate-900/60 p-3 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-center">
        <div className="w-full max-w-[800px] min-h-[600px] bg-white text-slate-900 shadow-2xl rounded-lg p-8 sm:p-14 font-sans text-sm sm:text-base leading-relaxed border border-slate-200/90 relative print:m-0 print:p-0 print:shadow-none">
          {/* Header watermark */}
          <div className="flex justify-between items-center text-[10px] text-slate-400 pb-4 mb-6 border-b border-slate-100 font-mono select-none">
            <span>{reportTitle}</span>
            <span>{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>

          {/* Editable Document Body */}
          <div
            ref={editorRef}
            contentEditable={!readOnly}
            onInput={handleInput}
            suppressContentEditableWarning
            className="outline-none min-h-[450px] space-y-3 font-normal text-slate-900 leading-relaxed word-document-content"
            style={{
              fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
              fontSize: '14.5px',
              lineHeight: '1.6',
            }}
          />

          {/* Footer page marker */}
          <div className="pt-8 mt-10 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 select-none">
            <span>RADNITO FAST • Medical Imaging Report</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordEditorCanvas;

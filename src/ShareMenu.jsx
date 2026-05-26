import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Share2, Clipboard, Image as ImageIcon, Download, Check } from 'lucide-react';
import { copyMarkdown, copyImageFromElement, downloadImageFromElement } from './shareUtils.js';

const ITEMS = [
  { id: 'copy-markdown', label: '复制 Markdown', icon: Clipboard, fn: (text, _ref) => copyMarkdown(text) },
  { id: 'copy-image', label: '复制为图片', icon: ImageIcon, fn: (_text, ref) => copyImageFromElement(ref()) },
  { id: 'download-image', label: '下载为图片', icon: Download, fn: (_text, ref) => downloadImageFromElement(ref()) },
];

const ShareMenu = ({ markdownText, contentRef }) => {
  const [open, setOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const handleClick = useCallback(async (item) => {
    try {
      await item.fn(markdownText, contentRef);
    } catch {
      // Fallback silently — user can try another option
    }
    setCopiedId(item.id);
    setOpen(false);
    setTimeout(() => setCopiedId(null), 1500);
  }, [markdownText, contentRef]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
          open ? 'bg-indigo-50 text-indigo-500' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
        }`}
        title="分享分析结果"
      >
        <Share2 className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/50 p-1 z-50 animate-in fade-in slide-in-from-bottom-1 duration-100">
          {ITEMS.map((item) => {
            const justCopied = copiedId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleClick(item)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {justCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <item.icon className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span className={justCopied ? 'text-emerald-600' : ''}>
                  {justCopied ? '已复制!' : item.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ShareMenu;

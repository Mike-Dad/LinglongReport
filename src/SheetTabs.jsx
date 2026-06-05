import React, { useState, useRef, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

const SheetTabs = ({ sheets, activeSheetIndex, onSwitch, onAdd, onRename, onDelete }) => {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startRename = (sheet) => {
    setEditingId(sheet.id);
    setEditName(sheet.name);
  };

  const confirmRename = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditName('');
  };

  return (
    <div className="shrink-0 bg-slate-200 border-t border-slate-300 flex items-stretch" style={{ height: 40 }}>
      <div
        ref={scrollRef}
        className="flex items-stretch gap-0 h-full overflow-x-auto custom-scrollbar" style={{ paddingLeft: 40 }}
      >
        {sheets.map((sheet, idx) => {
          const active = idx === activeSheetIndex;
          const editing = editingId === sheet.id;
          return (
            <div
              key={sheet.id}
              onClick={() => onSwitch(idx)}
              title={sheet.name}
              className={`group flex items-center gap-1.5 px-3 rounded-t-lg border border-b-0 cursor-pointer select-none transition-colors text-xs font-bold whitespace-nowrap ${
                active
                  ? 'bg-white text-indigo-600 border-slate-300 shadow-[0_-1px_3px_rgba(0,0,0,0.06)] -mt-[1px]'
                  : 'bg-transparent text-slate-500 border-transparent hover:bg-white/50 hover:text-slate-700'
              }`}
              style={{ minWidth: editing ? 110 : 72, maxWidth: 180 }}
            >
              {editing ? (
                <input
                  ref={inputRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmRename();
                    if (e.key === 'Escape') cancelRename();
                  }}
                  onBlur={confirmRename}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5 text-xs font-bold text-indigo-700 outline-none"
                />
              ) : (
                <span
                  onDoubleClick={(e) => { e.stopPropagation(); startRename(sheet); }}
                  className="truncate"
                >
                  {sheet.name}
                </span>
              )}
              {sheets.length > 1 && !editing && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(idx); }}
                  className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-slate-300/60 transition-opacity"
                >
                  <X className="w-3 h-3 text-slate-500" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button
        onClick={onAdd}
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-300/60 hover:text-indigo-600 transition-colors mx-0.5 self-center"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};

export default SheetTabs;

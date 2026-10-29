import React from 'react';
import { useMode } from '../context/ModeContext';
import { BellRing, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useMode();

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        let borderCol = 'border-emerald-500/40 text-emerald-400';
        if (toast.tone === 'rose') borderCol = 'border-rose-500/40 text-rose-400';
        if (toast.tone === 'amber') borderCol = 'border-amber-500/40 text-amber-400';
        if (toast.tone === 'cyan') borderCol = 'border-cyan-500/40 text-cyan-400';

        return (
          <div
            key={toast.id}
            className={`glass-panel pointer-events-auto p-3.5 rounded-xl border ${borderCol} shadow-2xl flex items-start gap-3 max-w-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-3`}
          >
            <div className="mt-0.5">
              <BellRing className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h5 className="text-xs font-bold text-white">{toast.title}</h5>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-500 hover:text-slate-300 transition -mr-1 -mt-1 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

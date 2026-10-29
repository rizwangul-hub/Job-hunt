import React from 'react';
import { useMode } from '../context/ModeContext';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export const DemoBanner: React.FC = () => {
  const { isDemoMode, toggleDemoMode } = useMode();

  if (!isDemoMode) {
    return null;
  }

  return (
    <div className="bg-amber-950/40 border-b border-amber-500/30 px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-amber-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong className="font-semibold text-amber-300">DEMO MODE ACTIVE:</strong> Sample job posts and mock replies are loaded. Actions are strictly simulated and never dispatched to real recruiters.
          </span>
        </div>
        <button
          onClick={toggleDemoMode}
          className="text-[11px] px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-mono transition"
        >
          Switch to Real Production Mode
        </button>
      </div>
    </div>
  );
};

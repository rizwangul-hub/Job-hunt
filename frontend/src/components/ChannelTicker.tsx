import React from 'react';
import { MessageSquare, Send, Linkedin, Terminal } from 'lucide-react';

export const ChannelTicker: React.FC = () => {
  return (
    <div className="bg-dark-900 border-b border-slate-800/50 px-4 py-2 text-xs overflow-x-auto whitespace-nowrap scrollbar-none">
      <div className="max-w-7xl mx-auto flex items-center gap-6 text-slate-400">
        <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400 uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          Active Listeners:
        </div>

        <div className="flex items-center gap-2 text-slate-300 bg-dark-850 px-2.5 py-1 rounded-md border border-slate-800">
          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            WhatsApp: <strong className="text-white font-normal">Pak Tech Internships & Jobs (#pk-mern)</strong>
          </span>
          <span className="text-emerald-400 text-[10px] bg-emerald-500/10 px-1 rounded">Polling (2s)</span>
        </div>

        <div className="flex items-center gap-2 text-slate-300 bg-dark-850 px-2.5 py-1 rounded-md border border-slate-800">
          <Send className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            Telegram: <strong className="text-white font-normal">Dev Opportunities PK (@devjobs_pk)</strong>
          </span>
          <span className="text-cyan-400 text-[10px] bg-cyan-500/10 px-1 rounded">Webhook OK</span>
        </div>

        <div className="flex items-center gap-2 text-slate-300 bg-dark-850 px-2.5 py-1 rounded-md border border-slate-800">
          <Linkedin className="w-3.5 h-3.5 text-blue-400" />
          <span>
            LinkedIn Stream: <strong className="text-white font-normal">#FullStack #MERN #ReactJobs</strong>
          </span>
          <span className="text-blue-400 text-[10px] bg-blue-500/10 px-1 rounded">Feed Ready</span>
        </div>

        <div className="flex items-center gap-2 text-slate-300 bg-dark-850 px-2.5 py-1 rounded-md border border-slate-800">
          <Terminal className="w-3.5 h-3.5 text-amber-400" />
          <span>
            Direct URL / Manual Parser: <strong className="text-white font-normal">Anti-SSRF Safe</strong>
          </span>
          <span className="text-emerald-400 text-[10px] bg-emerald-500/10 px-1 rounded">Ready</span>
        </div>
      </div>
    </div>
  );
};

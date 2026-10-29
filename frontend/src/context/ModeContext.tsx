import React, { createContext, useContext, useState, useEffect } from 'react';

interface Toast {
  id: string;
  title: string;
  message: string;
  tone: 'emerald' | 'cyan' | 'rose' | 'amber';
}

interface ModeContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  setDemoMode: (val: boolean) => void;
  agentActive: boolean;
  toggleAgent: () => Promise<void>;
  toasts: Toast[];
  showToast: (title: string, message: string, tone?: 'emerald' | 'cyan' | 'rose' | 'amber') => void;
  removeToast: (id: string) => void;
  playAlertChirp: () => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export const ModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem('rizagent_demo_mode') === 'true';
  });

  const [agentActive, setAgentActive] = useState<boolean>(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    localStorage.setItem('rizagent_demo_mode', isDemoMode.toString());
  }, [isDemoMode]);

  const toggleDemoMode = () => {
    setIsDemoMode((prev) => !prev);
    showToast(
      !isDemoMode ? 'Switched to Demo Mode' : 'Switched to Real Mode',
      !isDemoMode
        ? 'Using simulated job opportunities, mock channels, and test outreach.'
        : 'Active in Real Mode. Persisted database records and verified connections only.',
      !isDemoMode ? 'cyan' : 'emerald'
    );
  };

  const playAlertChirp = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      // Audio playback permission
    }
  };

  const showToast = (
    title: string,
    message: string,
    tone: 'emerald' | 'cyan' | 'rose' | 'amber' = 'emerald'
  ) => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, title, message, tone }]);
    playAlertChirp();

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleAgent = async () => {
    setAgentActive((prev) => !prev);
    showToast(
      !agentActive ? 'Agent Activated' : 'Agent Paused',
      !agentActive
        ? 'Listening on WhatsApp & Telegram group channels.'
        : 'Outreach automation is temporarily suspended.',
      !agentActive ? 'emerald' : 'amber'
    );
  };

  return (
    <ModeContext.Provider
      value={{
        isDemoMode,
        toggleDemoMode,
        setDemoMode: setIsDemoMode,
        agentActive,
        toggleAgent,
        toasts,
        showToast,
        removeToast,
        playAlertChirp,
      }}
    >
      {children}
    </ModeContext.Provider>
  );
};

export const useMode = () => {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
};

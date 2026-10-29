import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { IntegrationStatus } from '../types';
import { useMode } from '../context/ModeContext';
import {
  Plug,
  MessageSquare,
  Send,
  Linkedin,
  Mail,
  Rss,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Cpu,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

export const IntegrationsPage: React.FC = () => {
  const { showToast } = useMode();
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [browserWorkerStatus, setBrowserWorkerStatus] = useState<any>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const fetchIntegrations = async () => {
    try {
      const res = await api.get('/integrations');
      if (res.data.success) {
        setIntegrations(res.data.integrations);
        setBrowserWorkerStatus(res.data.browserWorker);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleTestConnection = async (provider: string) => {
    setTestingProvider(provider);
    try {
      const res = await api.post(`/integrations/${provider}/connect`, {});
      if (res.data.connected) {
        showToast('Connection Verified', res.data.message, 'emerald');
      } else {
        showToast('Connection Notice', res.data.message, 'amber');
      }
      fetchIntegrations();
    } catch (err: any) {
      showToast('Error', err.response?.data?.message || 'Connection test failed', 'rose');
    } finally {
      setTestingProvider(null);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'whatsapp':
        return <MessageSquare className="w-5 h-5 text-emerald-400" />;
      case 'telegram':
        return <Send className="w-5 h-5 text-cyan-400" />;
      case 'linkedin':
        return <Linkedin className="w-5 h-5 text-blue-400" />;
      case 'smtp':
        return <Mail className="w-5 h-5 text-rose-400" />;
      case 'rss':
        return <Rss className="w-5 h-5 text-amber-400" />;
      default:
        return <Plug className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Plug className="w-5 h-5 text-emerald-400" />
            Channel Integrations & Worker Infrastructure
          </h2>
          <p className="text-xs text-slate-400">
            Real connection testing and credential validation. Zero simulated connected states.
          </p>
        </div>
        <button
          onClick={fetchIntegrations}
          className="px-3 py-1.5 rounded-lg bg-dark-850 hover:bg-slate-800 text-slate-300 text-xs font-mono flex items-center gap-1.5 border border-slate-800 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Status
        </button>
      </div>

      {/* Browser Automation Worker Status Card */}
      <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-accent-cyan" />
            <h3 className="font-bold text-sm text-white">Playwright Browser Automation Worker</h3>
          </div>
          <span
            className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${
              browserWorkerStatus?.workerOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}
          >
            {browserWorkerStatus?.workerOnline ? 'Worker Online' : 'Worker Standby'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-dark-900 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px] font-mono">AUTOMATION ENGINE</span>
            <span className="font-bold text-white">Playwright Headless Chromium</span>
          </div>
          <div className="p-3 bg-dark-900 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px] font-mono">NAVIGATION RULES</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Anti-SSRF Enforced
            </span>
          </div>
          <div className="p-3 bg-dark-900 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px] font-mono">TIMEOUT LIMIT</span>
            <span className="font-mono text-slate-300">
              {browserWorkerStatus?.timeoutMs ? browserWorkerStatus.timeoutMs / 1000 : 30}s
            </span>
          </div>
        </div>
      </div>

      {/* Channel Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((item) => (
          <div
            key={item.provider}
            className="glass-panel p-5 rounded-xl border border-slate-800 flex flex-col justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-dark-900 border border-slate-800">
                    {getProviderIcon(item.provider)}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">{item.name}</h4>
                    <span className="text-[10px] text-slate-500 font-mono capitalize">Provider: {item.provider}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    item.connected
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {item.connected ? 'Connected' : 'Awaiting Config'}
                </span>
              </div>

              <p className="text-xs text-slate-300 font-mono bg-dark-900 p-2.5 rounded-lg border border-slate-800/80">
                {item.statusText}
              </p>

              {item.provider === 'whatsapp' && (
                <div className="p-2 rounded bg-dark-850 border border-slate-800 text-[11px] text-slate-400">
                  <strong className="text-slate-300">Platform Note:</strong> WhatsApp Cloud API operates on verified
                  phone templates. Group chats that cannot be accessed via official API use automated Click-to-Chat pre-filled
                  prompts.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">
                {item.lastSync ? `Last check: ${new Date(item.lastSync).toLocaleTimeString()}` : 'No sync recorded'}
              </span>

              <button
                onClick={() => handleTestConnection(item.provider)}
                disabled={testingProvider === item.provider}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center gap-1.5 border border-slate-700 transition disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${testingProvider === item.provider ? 'animate-spin' : ''}`}
                />
                Test Connection
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

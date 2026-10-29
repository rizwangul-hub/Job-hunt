import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useMode } from '../context/ModeContext';
import {
  Sliders,
  Shield,
  Save,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { showToast } = useMode();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [automationMode, setAutomationMode] = useState<'REVIEW_ONLY' | 'APPROVAL_REQUIRED' | 'RESTRICTED_AUTO_APPLY'>('APPROVAL_REQUIRED');
  const [minMatchThreshold, setMinMatchThreshold] = useState(80);
  const [maxAppsPerDay, setMaxAppsPerDay] = useState(15);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [internshipsJuniorOnly, setInternshipsJuniorOnly] = useState(false);
  const [blocklistedRecruiters, setBlocklistedRecruiters] = useState('');
  const [blocklistedCompanies, setBlocklistedCompanies] = useState('');

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data.success) {
        if (res.data.userPreferences) {
          setAutomationMode(res.data.userPreferences.automationMode || 'APPROVAL_REQUIRED');
          setMinMatchThreshold(res.data.userPreferences.minMatchThreshold || 80);
          setMaxAppsPerDay(res.data.userPreferences.maxApplicationsPerDay || 15);
          setRemoteOnly(!!res.data.userPreferences.remoteOnly);
          setInternshipsJuniorOnly(!!res.data.userPreferences.internshipsJuniorOnly);
        }
        if (res.data.systemSettings) {
          setBlocklistedRecruiters(res.data.systemSettings.blocklistedRecruiters?.join(', ') || '');
          setBlocklistedCompanies(res.data.systemSettings.blocklistedCompanies?.join(', ') || '');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/settings', {
        preferences: {
          automationMode,
          minMatchThreshold,
          maxApplicationsPerDay: maxAppsPerDay,
          remoteOnly,
          internshipsJuniorOnly
        },
        blocklistedRecruiters: blocklistedRecruiters.split(',').map((s) => s.trim()).filter(Boolean),
        blocklistedCompanies: blocklistedCompanies.split(',').map((s) => s.trim()).filter(Boolean)
      });

      if (res.data.success) {
        showToast('Settings Persisted', 'Automation configuration saved to MongoDB.', 'emerald');
      }
    } catch (err: any) {
      showToast('Error', err.response?.data?.message || 'Failed to save settings.', 'rose');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        <span className="text-xs font-mono">Loading system settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-accent-cyan" />
            Automation Controls & Engine Rules
          </h2>
          <p className="text-xs text-slate-400">Configure safety thresholds, auto-apply restrictions, and limits.</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-2 transition disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save System Configuration
        </button>
      </div>

      {/* AUTOMATION MODES SELECTION */}
      <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          Application Dispatch Mode
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Mode A */}
          <div
            onClick={() => setAutomationMode('REVIEW_ONLY')}
            className={`p-4 rounded-xl border cursor-pointer transition space-y-2 ${
              automationMode === 'REVIEW_ONLY'
                ? 'border-cyan-500/80 bg-cyan-950/20 shadow-md'
                : 'border-slate-800 bg-dark-900 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white">Mode A: Review Only</span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">Draft</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Detects and scores opportunities. Prepares application draft and cover letter. Never dispatches or submits automatically.
            </p>
          </div>

          {/* Mode B */}
          <div
            onClick={() => setAutomationMode('APPROVAL_REQUIRED')}
            className={`p-4 rounded-xl border cursor-pointer transition space-y-2 ${
              automationMode === 'APPROVAL_REQUIRED'
                ? 'border-emerald-500/80 bg-emerald-950/20 shadow-md'
                : 'border-slate-800 bg-dark-900 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white">Mode B: Approval Required</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold">Default</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Detects matching jobs and prepares form/message. Requires explicit candidate approval before final submission.
            </p>
          </div>

          {/* Mode C */}
          <div
            onClick={() => setAutomationMode('RESTRICTED_AUTO_APPLY')}
            className={`p-4 rounded-xl border cursor-pointer transition space-y-2 ${
              automationMode === 'RESTRICTED_AUTO_APPLY'
                ? 'border-amber-500/80 bg-amber-950/20 shadow-md'
                : 'border-slate-800 bg-dark-900 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white">Mode C: Restricted Auto-Apply</span>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Autonomous</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Automatically processes eligible jobs above threshold using verified profile data only. Enforces daily limits.
            </p>
          </div>
        </div>
      </div>

      {/* THRESHOLDS & FILTER SETTINGS */}
      <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white">Application Guardrails & Thresholds</h3>

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300 font-semibold">Minimum Match Score Threshold</span>
                <span className="font-mono text-emerald-400 font-bold">{minMatchThreshold}%</span>
              </div>
              <input
                type="range"
                min="60"
                max="95"
                value={minMatchThreshold}
                onChange={(e) => setMinMatchThreshold(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Max Daily Applications Limit</label>
              <input
                type="number"
                min="1"
                max="50"
                value={maxAppsPerDay}
                onChange={(e) => setMaxAppsPerDay(Number(e.target.value))}
                className="w-full bg-dark-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 outline-none focus:border-emerald-500 font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer bg-dark-900 p-3 rounded-lg border border-slate-800">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
                className="accent-emerald-500 w-4 h-4 rounded"
              />
              <div>
                <span className="text-slate-200 font-semibold block">Remote-Only Preference</span>
                <span className="text-[10px] text-slate-400">Strictly prioritize positions with remote flexibility.</span>
              </div>
            </label>

            <label className="flex items-center gap-2 cursor-pointer bg-dark-900 p-3 rounded-lg border border-slate-800">
              <input
                type="checkbox"
                checked={internshipsJuniorOnly}
                onChange={(e) => setInternshipsJuniorOnly(e.target.checked)}
                className="accent-emerald-500 w-4 h-4 rounded"
              />
              <div>
                <span className="text-slate-200 font-semibold block">Junior & Internship Focus</span>
                <span className="text-[10px] text-slate-400">Exclude roles requiring 4+ years senior experience.</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* BLOCKLISTS */}
      <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white">Blocklists (Prevent Outreach)</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Blocklisted Recruiters / Numbers</label>
            <input
              type="text"
              value={blocklistedRecruiters}
              onChange={(e) => setBlocklistedRecruiters(e.target.value)}
              placeholder="e.g. +923000000000, spam_recruiter"
              className="w-full bg-dark-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-emerald-500 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Blocklisted Companies</label>
            <input
              type="text"
              value={blocklistedCompanies}
              onChange={(e) => setBlocklistedCompanies(e.target.value)}
              placeholder="e.g. Acme Corp, SuspiciousAgency"
              className="w-full bg-dark-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-emerald-500 font-mono text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

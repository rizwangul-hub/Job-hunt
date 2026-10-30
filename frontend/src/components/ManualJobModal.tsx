import React, { useState } from 'react';
import { PlusCircle, X, Sparkles, Loader2, CheckCircle2, Copy, Layers } from 'lucide-react';
import api from '../services/api';
import { useMode } from '../context/ModeContext';

interface ManualJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobAdded: () => void;
}

export const ManualJobModal: React.FC<ManualJobModalProps> = ({ isOpen, onClose, onJobAdded }) => {
  const { showToast } = useMode();
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [rawText, setRawText] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'telegram' | 'linkedin' | 'manual'>('whatsapp');
  const [groupName, setGroupName] = useState('WhatsApp Job Group');
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [batchResults, setBatchResults] = useState<any>(null);

  if (!isOpen) return null;

  const handleDryRunAnalysis = async () => {
    if (!rawText.trim()) return;
    setIsAnalysing(true);
    try {
      const res = await api.post('/jobs/analyse', { rawText });
      if (res.data.success) {
        setPreviewData(res.data);
      }
    } catch (err: any) {
      showToast('Analysis Error', 'Could not parse job post.', 'amber');
    } finally {
      setIsAnalysing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) {
      showToast('Input Required', 'Please paste the job post content or message.', 'amber');
      return;
    }

    setIsSubmitting(true);
    try {
      if (activeTab === 'batch') {
        const res = await api.post('/jobs/batch', {
          messages: rawText,
          channel,
          groupName
        });
        if (res.data.success) {
          showToast('Batch Processed!', `Analyzed ${res.data.processedCount} jobs. Direct emails dispatched where contacts were found.`, 'emerald');
          setBatchResults(res.data.jobs);
          onJobAdded();
        }
      } else {
        const res = await api.post('/jobs/manual', {
          rawText,
          channel,
          groupName
        });

        if (res.data.success) {
          showToast('Opportunity Logged', `${res.data.job.title} added and evaluated.`, 'emerald');
          setRawText('');
          setPreviewData(null);
          onJobAdded();
          onClose();
        }
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to submit job.';
      showToast('Submission Notice', message, 'rose');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="glass-panel w-full max-w-xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-dark-900">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Job Ingestion & Auto-Outreach</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-dark-850 px-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'single'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Single Job Post</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('batch')}
            className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'batch'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>WhatsApp / Group Chat Multi-Feed (Batch)</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Source Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as any)}
                className="w-full bg-dark-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-emerald-500"
              >
                <option value="whatsapp">WhatsApp Group / Chat</option>
                <option value="telegram">Telegram Channel</option>
                <option value="linkedin">LinkedIn Post</option>
                <option value="manual">Manual / Web Application</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Source Name / Group</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Pakistan Tech Jobs (#pk-mern)"
                className="w-full bg-dark-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-400 font-semibold">
                {activeTab === 'batch'
                  ? 'Paste Multiple Messages from WhatsApp/Telegram Group (Separated by line breaks)'
                  : 'Paste Full Job Description or Recruiter Message'}
              </label>
              {activeTab === 'single' && (
                <button
                  type="button"
                  onClick={handleDryRunAnalysis}
                  disabled={isAnalysing || !rawText.trim()}
                  className="text-[11px] text-accent-cyan hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  {isAnalysing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Quick AI Dry-Run
                </button>
              )}
            </div>
            <textarea
              rows={activeTab === 'batch' ? 9 : 6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={
                activeTab === 'batch'
                  ? "Paste 5, 10, or 20 messages copied straight from your WhatsApp/Telegram group.\n\nRizAgent's AI will parse each message separately, extract skills, match your profile, and automatically dispatch emails or prepare 1-click WhatsApp links!"
                  : "Paste recruiter WhatsApp message, Telegram broadcast, email, or application text here..."
              }
              className="w-full bg-dark-900 border border-slate-800 rounded-lg p-3 text-slate-200 font-mono text-xs outline-none focus:border-emerald-500 resize-none leading-relaxed"
            />
          </div>

          {activeTab === 'batch' && (
            <div className="p-3 bg-dark-850 rounded-xl border border-emerald-500/20 text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                <Sparkles className="w-4 h-4" />
                <span>Zero-Effort Automated Outreach</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Jobs with an email contact are <strong>automatically emailed your CV and tailored cover letter</strong> via your Gmail SMTP. Jobs with phone numbers generate instant <strong>1-click WhatsApp direct chats</strong>!
              </p>
            </div>
          )}

          {batchResults && (
            <div className="p-3 bg-dark-850 border border-emerald-500/30 rounded-xl space-y-2">
              <span className="font-bold text-emerald-400 block">Batch Results Summary:</span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {batchResults.map((r: any, idx: number) => (
                  <div key={idx} className="p-2 bg-dark-900 rounded border border-slate-800 flex items-center justify-between text-[11px]">
                    <div>
                      <strong className="text-white">{r.title}</strong> &bull; {r.company}
                      <span className="text-slate-500 block font-mono">{r.action}</span>
                    </div>
                    {r.clickToChatUrl && (
                      <a
                        href={r.clickToChatUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[10px]"
                      >
                        Send WhatsApp
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {previewData && (
            <div className="p-3 bg-dark-850 border border-emerald-500/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> AI Evaluation Preview
                </span>
                <span className="font-mono text-xs font-bold text-white bg-emerald-500/20 px-2 py-0.5 rounded">
                  Match Score: {previewData.evaluation?.score}%
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                <strong>Detected Title:</strong> {previewData.extracted?.title} at {previewData.extracted?.company}
              </p>
              <p className="text-[11px] text-slate-400">
                <strong>Contact:</strong> {previewData.extracted?.contact} ({previewData.extracted?.contactType})
              </p>
              <div className="flex flex-wrap gap-1">
                {previewData.extracted?.matchedTech?.map((t: string, i: number) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !rawText.trim()}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : activeTab === 'batch' ? (
                <Sparkles className="w-3.5 h-3.5" />
              ) : (
                <PlusCircle className="w-3.5 h-3.5" />
              )}
              {activeTab === 'batch' ? 'Run AI Analysis & Auto-Dispatch All' : 'Save Opportunity to Pipeline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

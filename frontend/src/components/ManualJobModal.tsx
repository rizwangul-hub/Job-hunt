import React, { useState } from 'react';
import { PlusCircle, X, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { useMode } from '../context/ModeContext';

interface ManualJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobAdded: () => void;
}

export const ManualJobModal: React.FC<ManualJobModalProps> = ({ isOpen, onClose, onJobAdded }) => {
  const { showToast } = useMode();
  const [rawText, setRawText] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'telegram' | 'linkedin' | 'manual'>('whatsapp');
  const [groupName, setGroupName] = useState('Direct Candidate Input');
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

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
      const res = await api.post('/jobs/manual', {
        rawText,
        channel,
        groupName
      });

      if (res.data.success) {
        showToast('Opportunity Logged', `${res.data.job.title} added successfully.`, 'emerald');
        setRawText('');
        setPreviewData(null);
        onJobAdded();
        onClose();
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
            <h3 className="text-base font-bold text-white">Add Opportunity Manually</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
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
              <label className="block text-slate-400 font-semibold">Paste Full Job Description or Message</label>
              <button
                type="button"
                onClick={handleDryRunAnalysis}
                disabled={isAnalysing || !rawText.trim()}
                className="text-[11px] text-accent-cyan hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                {isAnalysing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Quick AI Dry-Run
              </button>
            </div>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste recruiter WhatsApp message, Telegram broadcast, email, or application text here..."
              className="w-full bg-dark-900 border border-slate-800 rounded-lg p-3 text-slate-200 font-mono text-xs outline-none focus:border-emerald-500 resize-none leading-relaxed"
            />
          </div>

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
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
              Save Opportunity to Pipeline
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

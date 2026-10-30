import React, { useState } from 'react';
import { JobOpportunity } from '../types';
import {
  Sparkles,
  X,
  Paperclip,
  CheckCircle,
  Send,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Calendar,
  MessageSquare
} from 'lucide-react';
import api from '../services/api';
import { useMode } from '../context/ModeContext';

interface ModalProps {
  job: JobOpportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onJobUpdated?: () => void;
}

export const Modal: React.FC<ModalProps> = ({ job, isOpen, onClose, onJobUpdated }) => {
  const { showToast } = useMode();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pitchText, setPitchText] = useState('');
  const [isEditingPitch, setIsEditingPitch] = useState(false);

  React.useEffect(() => {
    if (job) {
      setPitchText(
        job.pitchSent ||
          `Hi ${job.poster}, I noticed your opening requiring ${job.matchedTech.join(', ')}. I'm Rizwan Ullah, a Full-Stack MERN developer. My portfolio is at https://rizwanullah.dev and my resume is attached. Let's connect!`
      );
    }
  }, [job]);

  if (!isOpen || !job) return null;

  const isHighMatch = job.matchScore >= 80;

  // Compute live 1-click WhatsApp outreach link
  const getWhatsAppDirectUrl = () => {
    if (job.clickToChatUrl) return job.clickToChatUrl;
    if (job.contact && job.contact !== 'N/A') {
      const clean = job.contact.replace(/[^\d]/g, '');
      const formatted = clean.startsWith('03') && clean.length === 11 ? '92' + clean.substring(1) : clean;
      return `https://wa.me/${formatted}?text=${encodeURIComponent(pitchText)}`;
    }
    return null;
  };
  const whatsAppDirectUrl = getWhatsAppDirectUrl();

  const handleApproveAndDispatch = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.post(`/jobs/${job._id || job.id}/approve`, {
        message: pitchText,
      });

      if (res.data.success) {
        showToast('Outreach Dispatched!', `Pitch and verified CV processed for ${job.poster}.`, 'emerald');
        if (onJobUpdated) onJobUpdated();
        onClose();
      }
    } catch (err: any) {
      showToast('Dispatch Error', err.response?.data?.message || 'Could not dispatch outreach.', 'rose');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    try {
      await api.post(`/jobs/${job._id || job.id}/reject`);
      showToast('Opportunity Dismissed', 'Marked as rejected.', 'cyan');
      if (onJobUpdated) onJobUpdated();
      onClose();
    } catch (err: any) {
      showToast('Error', 'Could not reject opportunity.', 'amber');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-dark-900">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-white">LLM Classification & Outreach Dispatch</h3>
              <p className="text-xs text-slate-400">Detailed parsing results, match criteria, and candidate action</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          {/* Classification Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-dark-900 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-slate-500 block text-[10px]">SOURCE CHANNEL</span>
              <span className="font-bold text-white capitalize">{job.channel}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">DETECTED CONTACT</span>
              <span className="font-mono text-emerald-400 font-bold truncate block">{job.contact}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">EVALUATION SCORE</span>
              <span className={`font-mono font-bold ${isHighMatch ? 'text-emerald-400' : 'text-slate-400'}`}>
                {job.matchScore}% Full-Stack Match
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">AGENT ACTION</span>
              <span className="font-bold capitalize text-white">{job.status}</span>
            </div>
          </div>

          {/* Match Explanation */}
          {job.matchExplanation && (
            <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 text-[11px] leading-relaxed">
              <strong>Match Analysis:</strong> {job.matchExplanation}
            </div>
          )}

          {/* Raw Post Received */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Raw Post Text from Channel:</label>
            <div className="p-3 bg-dark-900 border border-slate-800 rounded-lg text-slate-300 font-mono leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
              {job.rawText}
            </div>
          </div>

          {/* Extracted Skills */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Extracted Developer Competencies:</label>
            <div className="flex flex-wrap gap-1.5">
              {job.matchedTech && job.matchedTech.length > 0 ? (
                job.matchedTech.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md bg-emerald-950/40 text-emerald-300 border border-emerald-800/50 font-mono font-medium"
                  >
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-slate-500 text-xs">No core tech directly matched</span>
              )}
            </div>
          </div>

          {/* Application URL */}
          {job.applicationUrl && (
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Direct Application Link:</label>
              <a
                href={job.applicationUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-accent-cyan hover:underline font-mono text-[11px] truncate"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span>{job.applicationUrl}</span>
              </a>
            </div>
          )}

          {/* Generated Pitch Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-semibold">Tailored Auto-Pitch (With CV & Portfolio Attached):</label>
              <button
                onClick={() => setIsEditingPitch(!isEditingPitch)}
                className="text-[10px] text-accent-cyan hover:underline font-mono"
              >
                {isEditingPitch ? 'Done Editing' : 'Edit Pitch Text'}
              </button>
            </div>
            <div className="p-3 bg-dark-900 border border-emerald-500/30 rounded-lg text-slate-200 font-mono leading-relaxed relative">
              <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">
                <Paperclip className="w-3 h-3" /> Resume.pdf attached
              </div>
              {isEditingPitch ? (
                <textarea
                  value={pitchText}
                  onChange={(e) => setPitchText(e.target.value)}
                  rows={4}
                  className="w-full bg-dark-850 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                />
              ) : (
                <p className="whitespace-pre-wrap">{pitchText}</p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-dark-900 flex flex-wrap items-center justify-between gap-3">
          {/* Quick 1-Click WhatsApp Direct Button (Always available when WhatsApp contact exists) */}
          {whatsAppDirectUrl && (
            <a
              href={whatsAppDirectUrl}
              target="_blank"
              rel="noreferrer"
              onClick={async () => {
                // Auto-mark as approved in RizAgent backend when user clicks to launch WhatsApp
                try {
                  await api.post(`/jobs/${job._id || job.id}/approve`, { message: pitchText });
                  if (onJobUpdated) onJobUpdated();
                } catch (e) {
                  // non-blocking
                }
              }}
              className="px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition border border-emerald-400/30"
            >
              <MessageSquare className="w-4 h-4 fill-white" />
              1-Click Send via WhatsApp (Phone / Web)
            </a>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {job.status === 'pending' || job.status === 'discarded' ? (
              <>
                <button
                  onClick={handleReject}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition"
                >
                  Dismiss Opportunity
                </button>
                <button
                  onClick={handleApproveAndDispatch}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Record Outreach
                </button>
              </>
            ) : (
              <>
                <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" /> Dispatched via {job.contactType}
                </span>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

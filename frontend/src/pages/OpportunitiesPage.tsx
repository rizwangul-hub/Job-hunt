import React, { useState, useEffect } from 'react';
import { useMode } from '../context/ModeContext';
import { JobOpportunity } from '../types';
import api from '../services/api';
import {
  Search,
  PlusCircle,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Sparkles
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { ManualJobModal } from '../components/ManualJobModal';

export const OpportunitiesPage: React.FC = () => {
  const { isDemoMode, showToast } = useMode();
  const [jobs, setJobs] = useState<JobOpportunity[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobOpportunity | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const fetchJobs = async () => {
    try {
      const res = await api.get(`/jobs?demo=${isDemoMode}&search=${encodeURIComponent(search)}`);
      if (res.data.success) {
        setJobs(res.data.jobs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [isDemoMode, search]);

  const handleApprove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.post(`/jobs/${id}/approve`, {});
      if (res.data.success) {
        showToast('Approved & Dispatched', 'Outreach message executed.', 'emerald');
        fetchJobs();
      }
    } catch (err: any) {
      showToast('Error', err.response?.data?.message || 'Approval failed.', 'rose');
    }
  };

  const handleReject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.post(`/jobs/${id}/reject`);
      showToast('Dismissed', 'Opportunity marked as rejected.', 'cyan');
      fetchJobs();
    } catch (err) {
      showToast('Error', 'Action failed.', 'amber');
    }
  };

  return (
    <div className="space-y-5">
      {/* Search and Action Bar */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search opportunities by title, company, skills, or recruiter..."
            className="w-full bg-dark-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
          />
        </div>

        <button
          onClick={() => setIsManualModalOpen(true)}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-2 transition"
        >
          <PlusCircle className="w-4 h-4" />
          Paste Job / URL
        </button>
      </div>

      {/* Opportunities List */}
      <div className="glass-panel rounded-xl overflow-hidden border border-slate-800">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            Discovered Opportunities Pipeline
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              {jobs.length} Found
            </span>
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            <span className="text-xs font-mono">Loading opportunities...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No job leads found matching search. Use <strong>"Paste Job / URL"</strong> to add one.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {jobs.map((job) => (
              <div
                key={job._id || job.id}
                onClick={() => {
                  setSelectedJob(job);
                  setIsInspectorOpen(true);
                }}
                className="p-4 hover:bg-dark-850/60 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-sm">{job.title}</span>
                    <span className="text-xs text-slate-400">&bull; {job.company}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-900 text-slate-300 border border-slate-700">
                      {job.channel}
                    </span>
                    {job.isRemote && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        Remote
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 font-mono truncate">{job.rawText}</p>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {job.matchedTech?.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/50 font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="block text-[10px] text-slate-500 font-mono">MATCH SCORE</span>
                    <span
                      className={`text-base font-bold font-mono ${
                        job.matchScore >= 80 ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {job.matchScore}%
                    </span>
                  </div>

                  {job.status === 'pending' ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleApprove(job._id || job.id!, e)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={(e) => handleReject(job._id || job.id!, e)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {job.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        job={selectedJob}
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        onJobUpdated={fetchJobs}
      />

      <ManualJobModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onJobAdded={fetchJobs}
      />
    </div>
  );
};

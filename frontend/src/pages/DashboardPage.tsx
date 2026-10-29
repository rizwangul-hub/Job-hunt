import React, { useState, useEffect } from 'react';
import { useMode } from '../context/ModeContext';
import { JobOpportunity, DashboardStats } from '../types';
import api from '../services/api';
import {
  Radar,
  CheckCheck,
  Send,
  MessageCircle,
  PlusCircle,
  ShieldCheck,
  Clock,
  ChevronRight,
  MessageSquare,
  Globe,
  Loader2
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { ManualJobModal } from '../components/ManualJobModal';

export const DashboardPage: React.FC = () => {
  const { isDemoMode, showToast } = useMode();
  const [stats, setStats] = useState<DashboardStats>({
    scannedToday: 0,
    analyzedTotal: 0,
    fullStackMatches: 0,
    awaitingApproval: 0,
    submittedSuccessfully: 0,
    requiringAttention: 0,
    failedAttempts: 0,
    recruiterRepliesCount: 0,
    unreadRepliesCount: 0
  });

  const [jobs, setJobs] = useState<JobOpportunity[]>([]);
  const [filter, setFilter] = useState<'all' | 'auto-sent' | 'pending'>('all');
  const [selectedJob, setSelectedJob] = useState<JobOpportunity | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, jobsRes] = await Promise.all([
        api.get(`/dashboard/stats?demo=${isDemoMode}`),
        api.get(`/jobs?demo=${isDemoMode}&filter=${filter}`)
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }
      if (jobsRes.data.success) {
        setJobs(jobsRes.data.jobs);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isDemoMode, filter]);

  const handleOpenInspector = (job: JobOpportunity) => {
    setSelectedJob(job);
    setIsInspectorOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* KPI STATS CARDS */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Scanned Today */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Scanned Today</span>
            <Radar className="w-4 h-4 text-slate-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">{stats.scannedToday}</span>
            <span className="text-xs text-emerald-400 font-mono">+12/hr</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-slate-400 h-full rounded-full" style={{ width: '75%' }}></div>
          </div>
        </div>

        {/* Full-Stack Matches */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Full-Stack Matches</span>
            <CheckCheck className="w-4 h-4 text-accent-cyan" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-accent-cyan">{stats.fullStackMatches}</span>
            <span className="text-xs text-slate-400">Score &ge; 80%</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-accent-cyan h-full rounded-full" style={{ width: '60%' }}></div>
          </div>
        </div>

        {/* Outreaches Dispatched */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Outreaches Dispatched</span>
            <Send className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">{stats.submittedSuccessfully}</span>
            <span className="text-xs text-emerald-400">WhatsApp & Email</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '72%' }}></div>
          </div>
        </div>

        {/* Recruiter Replies */}
        <div className="glass-panel p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Recruiter Replies</span>
            <MessageCircle className="w-4 h-4 text-accent-rose" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-accent-rose">{stats.recruiterRepliesCount}</span>
            <span className="text-xs text-accent-rose font-medium bg-rose-500/10 px-1.5 rounded">
              {stats.unreadRepliesCount} Pending
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-rose-500 h-full rounded-full" style={{ width: '40%' }}></div>
          </div>
        </div>
      </section>

      {/* FILTER & CRITERIA BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white flex items-center gap-2">
            Live Opportunities & Matches
            <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-mono">
              {jobs.length}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Filter:</span>
          <button
            onClick={() => setFilter('all')}
            className={`filter-chip px-2.5 py-1 rounded transition ${
              filter === 'all'
                ? 'bg-slate-800 text-slate-200 border border-slate-700 font-semibold'
                : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('auto-sent')}
            className={`filter-chip px-2.5 py-1 rounded transition ${
              filter === 'auto-sent'
                ? 'bg-slate-800 text-slate-200 border border-slate-700 font-semibold'
                : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            Auto-Sent
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`filter-chip px-2.5 py-1 rounded transition ${
              filter === 'pending'
                ? 'bg-slate-800 text-slate-200 border border-slate-700 font-semibold'
                : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            Review Needed
          </button>
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="ml-2 text-xs px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 flex items-center gap-1.5 transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Paste Job
          </button>
        </div>
      </div>

      {/* Auto-Outreach Criteria Banner */}
      <div className="glass-panel p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 border-emerald-500/20 bg-emerald-950/20">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-emerald-300">
              Auto-Outreach Criteria: MERN Stack &bull; Full Stack Developer &bull; React Native
            </p>
            <p className="text-xs text-slate-400">
              Agent auto-dispatches tailored CV & Portfolio pitch if Match &ge; 80% and valid contact is verified.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsManualModalOpen(true)}
          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 flex items-center gap-1.5 transition"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Manual Job Lead
        </button>
      </div>

      {/* JOB STREAM LIST */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            <span className="text-xs font-mono">Loading real-time pipeline...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="glass-panel p-8 text-center rounded-xl text-slate-400 text-xs">
            No opportunities found under this filter. Click <strong>"Paste Job"</strong> or <strong>"Simulate Post"</strong> to feed opportunities.
          </div>
        ) : (
          jobs.map((job) => {
            const isHighMatch = job.matchScore >= 80;
            const channelIcon =
              job.channel === 'whatsapp' ? (
                <MessageSquare className="w-4 h-4 text-emerald-400" />
              ) : job.channel === 'telegram' ? (
                <Send className="w-4 h-4 text-cyan-400" />
              ) : (
                <Globe className="w-4 h-4 text-blue-400" />
              );

            let statusBadge = null;
            if (job.status === 'auto-sent') {
              statusBadge = (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                  <CheckCheck className="w-3 h-3" /> Auto-Pitch Dispatched
                </span>
              );
            } else if (job.status === 'pending') {
              statusBadge = (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  <Clock className="w-3 h-3" /> Review Needed ({job.matchScore}%)
                </span>
              );
            } else {
              statusBadge = (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                  Discarded (Low Match)
                </span>
              );
            }

            return (
              <div
                key={job._id || job.id}
                onClick={() => handleOpenInspector(job)}
                className="glass-panel-interactive p-4 rounded-xl space-y-3 cursor-pointer"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-dark-900 border border-slate-800">
                      {channelIcon}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {job.poster}
                        <span className="text-xs font-normal text-slate-400">
                          in [{job.groupName || job.company}]
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {job.title} &bull; Contact: {job.contact}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-xs text-slate-400">Match: </span>
                      <span
                        className={`font-mono font-bold text-sm ${
                          isHighMatch ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {job.matchScore}%
                      </span>
                    </div>
                    {statusBadge}
                  </div>
                </div>

                <div className="bg-dark-900/80 p-3 rounded-lg border border-slate-800/80 text-xs text-slate-300 font-mono leading-relaxed line-clamp-3">
                  {job.rawText}
                </div>

                <div className="flex flex-wrap items-center justify-between pt-1 gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {job.matchedTech?.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2 py-0.5 rounded bg-dark-900 text-slate-300 border border-slate-700/60 font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300">
                    <span>View Full Agent Analysis</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Post Details & Dispatch Inspector Modal */}
      <Modal
        job={selectedJob}
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        onJobUpdated={fetchData}
      />

      {/* Manual Job Modal */}
      <ManualJobModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onJobAdded={fetchData}
      />
    </div>
  );
};

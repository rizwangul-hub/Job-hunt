import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { ApplicationRecord } from '../types';
import { useMode } from '../context/ModeContext';
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  XCircle,
  FileText,
  Loader2,
  ChevronRight
} from 'lucide-react';

const ALL_STATUSES = [
  'All',
  'Review Required',
  'Ready to Submit',
  'Submitted',
  'Awaiting Human Verification',
  'Submission Unconfirmed',
  'Interview',
  'Offer',
  'Failed',
  'Rejected'
];

export const ApplicationsPage: React.FC = () => {
  const { showToast } = useMode();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);

  const fetchApplications = async () => {
    try {
      const url = statusFilter === 'All' ? '/applications' : `/applications?status=${encodeURIComponent(statusFilter)}`;
      const res = await api.get(url);
      if (res.data.success) {
        setApplications(res.data.applications);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const handleUpdateStatus = async (appId: string, newStatus: string) => {
    try {
      const res = await api.patch(`/applications/${appId}/status`, {
        status: newStatus,
        note: `Status manually updated to ${newStatus}`
      });

      if (res.data.success) {
        showToast('Application Updated', `Status changed to ${newStatus}`, 'emerald');
        fetchApplications();
        if (selectedApp && selectedApp._id === appId) {
          setSelectedApp(res.data.application);
        }
      }
    } catch (err: any) {
      showToast('Error', err.response?.data?.message || 'Could not update status.', 'rose');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter chips */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-violet-400" />
            Application Lifecycle & Pipeline Tracking
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Total Tracked: <strong className="text-white">{applications.length}</strong>
          </span>
        </div>

        {/* Filter Scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {ALL_STATUSES.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition font-mono ${
                statusFilter === st
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700 font-semibold'
                  : 'bg-dark-900 text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Application List + Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Applications Table / Cards */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span className="text-xs font-mono">Loading applications...</span>
            </div>
          ) : applications.length === 0 ? (
            <div className="glass-panel p-8 text-center rounded-xl text-slate-400 text-xs">
              No application records found under filter "{statusFilter}".
            </div>
          ) : (
            applications.map((app) => {
              const job: any = app.jobId || {};
              const isSelected = selectedApp?._id === app._id;

              let statusColor = 'bg-slate-800 text-slate-300 border-slate-700';
              if (app.status === 'Submitted') statusColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
              if (app.status === 'Interview') statusColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
              if (app.status === 'Offer') statusColor = 'bg-emerald-500 text-slate-950 font-bold border-emerald-400';
              if (app.status === 'Failed' || app.status === 'Rejected') statusColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
              if (app.status === 'Review Required' || app.status === 'Awaiting Human Verification')
                statusColor = 'bg-amber-500/10 text-amber-300 border-amber-500/30';

              return (
                <div
                  key={app._id}
                  onClick={() => setSelectedApp(app)}
                  className={`glass-panel p-4 rounded-xl border transition cursor-pointer space-y-2 ${
                    isSelected ? 'border-emerald-500/60 bg-dark-850' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {job.title || 'Untitled Opening'}
                        <span className="text-xs font-normal text-slate-400">&bull; {job.company || 'Undisclosed'}</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Applied via: {app.mode} &bull; CV: {app.cvUsed}
                      </p>
                    </div>

                    <span className={`text-[11px] font-mono px-2.5 py-1 rounded-full border ${statusColor}`}>
                      {app.status}
                    </span>
                  </div>

                  {app.draftMessage && (
                    <p className="text-xs text-slate-300 font-mono line-clamp-2 bg-dark-900/60 p-2 rounded">
                      {app.draftMessage}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 font-mono">
                    <span>Created: {new Date(app.createdAt).toLocaleDateString()}</span>
                    <span className="text-emerald-400 hover:underline flex items-center gap-1">
                      View Audit Log &bull; Status Controls <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Status Transition & Audit Panel */}
        <div className="lg:col-span-1 glass-panel p-5 rounded-xl border border-slate-800 h-fit space-y-4">
          <h3 className="text-sm font-bold text-white pb-2 border-b border-slate-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Application Action Center
          </h3>

          {selectedApp ? (
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-mono">CURRENT STATUS</span>
                <span className="font-bold text-sm text-emerald-400">{selectedApp.status}</span>
              </div>

              {/* Status Update Dropdown */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Update Status:</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {['Interview', 'Offer', 'Rejected', 'Submitted', 'Closed'].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleUpdateStatus(selectedApp._id, s)}
                      className="px-2.5 py-1.5 rounded bg-dark-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-left font-mono transition text-[11px]"
                    >
                      &rarr; {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* CV Used */}
              <div className="p-2.5 bg-dark-900 rounded-lg border border-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-500 block">CV ATTACHED</span>
                  <span className="font-mono text-slate-200 truncate block text-[11px]">{selectedApp.cvUsed}</span>
                </div>
              </div>

              {/* History / Audit Log */}
              <div>
                <span className="text-slate-400 font-semibold block mb-1">Approval & Audit Trail:</span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedApp.approvalHistory?.map((h, i) => (
                    <div key={i} className="p-2 bg-dark-900 rounded border border-slate-800 text-[10px] space-y-0.5">
                      <div className="flex items-center justify-between text-slate-400 font-mono">
                        <span className="font-bold text-slate-300">{h.action}</span>
                        <span>{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {h.note && <p className="text-slate-400">{h.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              Select an application record from the list to inspect details or transition its status.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

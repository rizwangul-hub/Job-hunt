import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { RecruiterConversation } from '../types';
import { useMode } from '../context/ModeContext';
import {
  MessageSquare,
  BellRing,
  Send,
  Calendar,
  Loader2,
  CheckCircle,
  Inbox
} from 'lucide-react';

export const RepliesPage: React.FC = () => {
  const { isDemoMode, showToast } = useMode();
  const [replies, setReplies] = useState<RecruiterConversation[]>([]);
  const [selectedReply, setSelectedReply] = useState<RecruiterConversation | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchReplies = async () => {
    try {
      const res = await api.get(`/replies?demo=${isDemoMode}`);
      if (res.data.success) {
        setReplies(res.data.replies);
        if (res.data.replies.length > 0 && !selectedReply) {
          setSelectedReply(res.data.replies[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReplies();
  }, [isDemoMode]);

  const handleSelectReply = async (rep: RecruiterConversation) => {
    setSelectedReply(rep);
    if (!rep.read) {
      try {
        await api.get(`/replies/${rep._id || rep.id}`);
        setReplies((prev) =>
          prev.map((r) => ((r._id || r.id) === (rep._id || rep.id) ? { ...r, read: true } : r))
        );
      } catch (e) {
        // ignore
      }
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim() || !selectedReply) return;

    setIsSending(true);
    const targetId = selectedReply._id || selectedReply.id;
    try {
      const res = await api.post(`/replies/${targetId}/send`, {
        text: replyInput.trim()
      });

      if (res.data.success) {
        setReplyInput('');
        showToast('Message Sent', `Dispatched response to ${selectedReply.recruiterName}.`, 'emerald');
        setSelectedReply(res.data.conversation);
        setReplies((prev) =>
          prev.map((r) => ((r._id || r.id) === targetId ? res.data.conversation : r))
        );
      }
    } catch (err: any) {
      showToast('Error', err.response?.data?.message || 'Could not send reply.', 'rose');
    } finally {
      setIsSending(false);
    }
  };

  const handleSimulateReply = async () => {
    try {
      const res = await api.post('/replies/simulate', {
        recruiterName: 'Sarah HR (FinTech Solutions PK)',
        channel: 'WhatsApp',
        contact: '+92 345 8899221',
        message: 'Hi Rizwan, your MERN stack and React Native profile looks like a great fit! Can we connect for a quick 10-minute screening call today?'
      });

      if (res.data.success) {
        showToast('Recruiter Replied!', 'Sarah HR replied to your outreach on WhatsApp.', 'rose');
        setReplies((prev) => [res.data.conversation, ...prev]);
        setSelectedReply(res.data.conversation);
      }
    } catch (err) {
      showToast('Simulation Error', 'Could not simulate recruiter response.', 'amber');
    }
  };

  const handleScheduleMeeting = () => {
    showToast('Google Meet Prepared', 'Invitation link copied: https://meet.google.com/riz-mern-interview', 'emerald');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left List of Inquiries */}
      <div className="lg:col-span-1 glass-panel rounded-xl p-4 flex flex-col gap-3 border border-slate-800">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            Active Inquiries
          </h3>
          <span className="text-xs text-slate-400 font-mono">{replies.length} Total</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span className="text-xs font-mono">Loading inquiries...</span>
          </div>
        ) : replies.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            No inquiries logged yet.
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto max-h-[580px] pr-1">
            {replies.map((rep) => {
              const isSelected = (selectedReply?._id || selectedReply?.id) === (rep._id || rep.id);
              return (
                <div
                  key={rep._id || rep.id}
                  onClick={() => handleSelectReply(rep)}
                  className={`p-3 rounded-lg border transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-emerald-500/50 shadow-sm'
                      : 'bg-dark-900 border-slate-800/80 hover:bg-dark-850'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold border border-emerald-500/40">
                        {rep.recruiterAvatar || 'HR'}
                      </span>
                      <span className="text-xs font-bold text-white truncate max-w-[140px]">
                        {rep.recruiterName}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(rep.updatedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 truncate">{rep.lastMessage}</p>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/60 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 font-mono">
                      <MessageSquare className="w-3 h-3 text-emerald-400" /> {rep.channel}
                    </span>
                    {!rep.read ? (
                      <span className="text-rose-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Unread
                      </span>
                    ) : (
                      <span className="text-slate-500">Viewed</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={handleSimulateReply}
          className="mt-2 w-full py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition"
        >
          <BellRing className="w-3.5 h-3.5 text-accent-rose" />
          Trigger Simulated Recruiter Reply
        </button>
      </div>

      {/* Right Detail View / Conversation Thread */}
      <div className="lg:col-span-2 glass-panel rounded-xl p-5 flex flex-col justify-between h-[650px] border border-slate-800">
        {selectedReply ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center border border-emerald-500/40 text-sm">
                  {selectedReply.recruiterAvatar || 'HR'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    {selectedReply.recruiterName}
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {selectedReply.channel} Verified
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Company: {selectedReply.company || 'Direct Contact'} &bull; Contact: {selectedReply.contact}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleScheduleMeeting}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Book Google Meet
                </button>
              </div>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedReply.messages?.map((m, idx) => {
                const isAgent = m.sender === 'agent';
                return (
                  <div key={idx} className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-slate-500 mb-0.5 font-mono">
                      {isAgent ? 'RizAgent (Auto-Pitch / You)' : selectedReply.recruiterName}
                    </span>
                    <div
                      className={`max-w-[80%] rounded-xl p-3 text-xs leading-relaxed ${
                        isAgent
                          ? 'bg-emerald-600 text-white rounded-tr-none'
                          : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Input */}
            <div className="pt-3 border-t border-slate-800">
              <form onSubmit={handleSendReply} className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  placeholder={`Type your reply to ${selectedReply.recruiterName}...`}
                  className="flex-1 bg-dark-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={isSending || !replyInput.trim()}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="m-auto text-slate-500 text-xs flex flex-col items-center gap-2">
            <Inbox className="w-8 h-8 text-slate-600" />
            <span>Select an inquiry from the left panel to view conversation thread</span>
          </div>
        )}
      </div>
    </div>
  );
};

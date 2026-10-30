import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMode } from '../context/ModeContext';
import {
  Bot,
  Play,
  Pause,
  Sparkles,
  Bell,
  LogOut,
  Sliders,
  Inbox,
  LayoutDashboard,
  Briefcase,
  Layers,
  Plug,
  UserCheck
} from 'lucide-react';
import api from '../services/api';

interface NavbarProps {
  unreadCount?: number;
  onSimulatePost?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ unreadCount = 0, onSimulatePost }) => {
  const { user, logout } = useAuth();
  const { isDemoMode, toggleDemoMode, agentActive, toggleAgent, showToast } = useMode();
  const navigate = useNavigate();

  const handleSimulateClick = async () => {
    if (onSimulatePost) {
      onSimulatePost();
      return;
    }

    if (!agentActive) {
      showToast('Agent Paused', 'Activate the agent first to monitor incoming job posts.', 'amber');
      return;
    }

    try {
      const samplePosts = [
        'Urgent requirement! Looking for Full-Stack MERN Developer (React, Node, Express, MongoDB) for a 6-month contract with possibility of full-time. Remote in PK. Share portfolio and CV to WhatsApp: +92 345 9182341.',
        'Immediate opening for Junior React Native Developer with strong React + Node backend experience for mobile fintech app. Send resume to jobs@fintechapp.pk.'
      ];
      const randomText = samplePosts[Math.floor(Math.random() * samplePosts.length)];
      
      const res = await api.post('/jobs/manual', {
        rawText: randomText,
        channel: 'whatsapp',
        groupName: 'Pakistan Tech Internships & Jobs'
      });

      if (res.data.success) {
        showToast('New Job Lead Found!', `${res.data.job.title} (${res.data.job.matchScore}% Match).`, 'emerald');
      }
    } catch (err: any) {
      showToast('Simulation Notice', err.response?.data?.message || 'Duplicate or invalid simulation data.', 'amber');
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
      isActive
        ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
        : 'text-slate-400 hover:text-white hover:bg-dark-850'
    }`;

  return (
    <header className="border-b border-slate-800/80 bg-dark-900/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Agent Indicator */}
        <div className="flex items-center gap-3">
          <NavLink to="/" className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-cyan shadow-lg shadow-brand-500/20">
              <Bot className="w-5 h-5 text-white" />
              {agentActive && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                  RizAgent <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">v2.4 Live</span>
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">| Full-Stack Autonomous Pipeline</span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                Targeting: <span className="text-slate-200 font-medium">MERN & React Native</span> &bull; <span>{user?.fullName || 'Rizwan Ullah'}</span>
              </p>
            </div>
          </NavLink>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden xl:flex items-center gap-1">
          <NavLink to="/" end className={navLinkClass}>
            <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/opportunities" className={navLinkClass}>
            <Briefcase className="w-3.5 h-3.5 text-accent-cyan" />
            <span>Opportunities</span>
          </NavLink>
          <NavLink to="/applications" className={navLinkClass}>
            <Layers className="w-3.5 h-3.5 text-violet-400" />
            <span>Applications Tracker</span>
          </NavLink>
          <NavLink to="/replies" className={navLinkClass}>
            <Inbox className="w-3.5 h-3.5 text-accent-rose" />
            <span>Recruiter Replies</span>
            {unreadCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono">
                {unreadCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/profile" className={navLinkClass}>
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Profile & CV</span>
          </NavLink>
          <NavLink to="/integrations" className={navLinkClass}>
            <Plug className="w-3.5 h-3.5 text-amber-400" />
            <span>Integrations</span>
          </NavLink>
          <NavLink to="/settings" className={navLinkClass}>
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Settings</span>
          </NavLink>
        </nav>

        {/* Controls & Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {/* Mode Badge Toggle */}
          <button
            onClick={toggleDemoMode}
            title="Click to toggle between Demo Mode and Real Production Mode"
            className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold border transition flex items-center gap-1.5 ${
              isDemoMode
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isDemoMode ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
            <span>{isDemoMode ? 'DEMO MODE' : 'REAL MODE'}</span>
          </button>

          {/* Master Agent Switch */}
          <div className="flex items-center bg-dark-850 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={toggleAgent}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition font-semibold shadow-sm ${
                agentActive
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {agentActive ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{agentActive ? 'Agent Active' : 'Monitoring Paused'}</span>
            </button>
            <button
              onClick={handleSimulateClick}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/80 transition"
              title="Simulate incoming recruiter job post"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
              <span className="hidden md:inline">Simulate Post</span>
            </button>
          </div>

          {/* Notification Bell */}
          <button
            onClick={() => navigate('/replies')}
            className="relative p-2.5 rounded-lg bg-dark-850 hover:bg-dark-800 border border-slate-800 text-slate-300 hover:text-white transition"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-accent-rose text-white border border-dark-950">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Profile & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <NavLink
              to="/profile"
              title="View Profile"
              className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-700 flex items-center justify-center text-xs font-bold text-white uppercase shadow-inner hover:ring-2 hover:ring-emerald-500/50 transition"
            >
              RU
            </NavLink>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

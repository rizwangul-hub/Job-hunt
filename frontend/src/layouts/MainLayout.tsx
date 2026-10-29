import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { ChannelTicker } from '../components/ChannelTicker';
import { DemoBanner } from '../components/DemoBanner';
import { ToastContainer } from '../components/ToastContainer';
import { useMode } from '../context/ModeContext';
import api from '../services/api';

export const MainLayout: React.FC = () => {
  const { isDemoMode } = useMode();
  const [unreadReplies, setUnreadReplies] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get(`/dashboard/stats?demo=${isDemoMode}`);
      if (res.data.success) {
        setUnreadReplies(res.data.stats.unreadRepliesCount || 0);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, [isDemoMode]);

  return (
    <div className="bg-dark-950 text-slate-100 font-sans min-h-screen antialiased flex flex-col selection:bg-brand-500 selection:text-white">
      <Navbar unreadCount={unreadReplies} />
      <DemoBanner />
      <ChannelTicker />
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-6 flex flex-col gap-6">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
};

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bot, Lock, Mail, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('rizwangul535@gmail.com');
  const [password, setPassword] = useState('peral@2426');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        navigate('/');
      } else {
        setError(res.message || 'Login failed. Please check credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 selection:bg-brand-500 selection:text-white">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 md:p-8 border border-slate-800 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-cyan shadow-lg shadow-brand-500/20 mb-2">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">RizAgent AI Command Center</h1>
          <p className="text-xs text-slate-400">Autonomous Job Hunter & Outreach Engine</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rizwangul535@gmail.com"
                className="w-full bg-dark-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-dark-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Quick Default Credentials Hint */}
          <div className="p-2.5 bg-dark-900 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <span className="text-slate-300 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Default Initial Credentials:
            </span>
            <p className="font-mono text-[10px] text-slate-400">
              Email: <span className="text-emerald-400">rizwangul535@gmail.com</span> &bull; Pass:{' '}
              <span className="text-emerald-400">peral@2426</span>
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 mt-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Authenticate & Access Dashboard
          </button>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useMode } from '../context/ModeContext';
import {
  UserCheck,
  Cpu,
  Save,
  FileText,
  Upload,
  Trash2,
  CheckCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { showToast } = useMode();

  const [fullName, setFullName] = useState(user?.fullName || 'Rizwan Ullah');
  const [handle, setHandle] = useState(user?.handle || 'Rizwan');
  const [phone, setPhone] = useState(user?.phone || '+92 300 0000000');
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp || '+92 300 0000000');
  const [portfolioUrl, setPortfolioUrl] = useState(user?.portfolioUrl || 'https://full-stack-portfolio-coral.vercel.app');
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedinUrl || 'https://www.linkedin.com/in/rizwanmerndev');
  const [githubUrl, setGithubUrl] = useState(user?.githubUrl || 'https://github.com/rizwangul-hub');
  const [targetRoles, setTargetRoles] = useState(user?.targetRoles?.join(', ') || 'Full-Stack MERN Developer, React Native Mobile Engineer');
  const [pitchTemplate, setPitchTemplate] = useState(
    user?.preferences?.pitchTemplate ||
      `Hi {{contact_name}}, I noticed your post regarding the {{role_title}} role requiring {{matched_tech}}.\n\nI'm Rizwan Ullah, a Full-Stack MERN & Mobile developer with hands-on experience building production web apps (MongoDB, Express, React, Node.js) and cross-platform mobile apps with React Native.\n\n🚀 Live Portfolio: {{portfolio_url}}\n📄 Attached: Resume PDF\n\nI'd be glad to discuss how I can contribute immediately. Looking forward to hearing from you!`
  );
  const [threshold, setThreshold] = useState(user?.preferences?.minMatchThreshold || 80);
  const [isSaving, setIsSaving] = useState(false);

  // CV Upload state
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvCategory, setCvCategory] = useState<'Full Stack / MERN' | 'React / Frontend' | 'React Native / Mobile' | 'Internship / Junior'>('Full Stack / MERN');
  const [isUploadingCV, setIsUploadingCV] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || 'Rizwan Ullah');
      setHandle(user.handle || 'Rizwan');
      setPhone(user.phone || '+92 300 0000000');
      setWhatsapp(user.whatsapp || '+92 300 0000000');
      setPortfolioUrl(user.portfolioUrl || 'https://full-stack-portfolio-coral.vercel.app');
      setLinkedinUrl(user.linkedinUrl || 'https://www.linkedin.com/in/rizwanmerndev');
      setGithubUrl(user.githubUrl || 'https://github.com/rizwangul-hub');
      setTargetRoles(user.targetRoles?.join(', ') || '');
      if (user.preferences?.pitchTemplate) setPitchTemplate(user.preferences.pitchTemplate);
      if (user.preferences?.minMatchThreshold) setThreshold(user.preferences.minMatchThreshold);
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const res = await api.put('/profile', {
        fullName,
        handle,
        phone,
        whatsapp,
        portfolioUrl,
        linkedinUrl,
        githubUrl,
        targetRoles: targetRoles.split(',').map((r) => r.trim()).filter(Boolean),
        preferences: {
          ...user?.preferences,
          minMatchThreshold: Number(threshold),
          pitchTemplate
        }
      });

      if (res.data.success) {
        showToast('Preferences Saved', 'Agent profile identity and pitch template successfully updated.', 'emerald');
        await refreshProfile();
      }
    } catch (err: any) {
      showToast('Error', err.response?.data?.message || 'Could not update profile.', 'rose');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadCV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cvFile) {
      showToast('File Required', 'Select a PDF or DOCX file to upload.', 'amber');
      return;
    }

    setIsUploadingCV(true);
    const formData = new FormData();
    formData.append('cvFile', cvFile);
    formData.append('category', cvCategory);
    formData.append('name', cvFile.name);

    try {
      const res = await api.post('/profile/cv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        showToast('CV Uploaded', 'CV file verified and attached to profile.', 'emerald');
        setCvFile(null);
        await refreshProfile();
      }
    } catch (err: any) {
      showToast('Upload Error', err.response?.data?.message || 'Failed to upload CV.', 'rose');
    } finally {
      setIsUploadingCV(false);
    }
  };

  const handleDeleteCV = async (cvId: string) => {
    try {
      const res = await api.delete(`/profile/cv/${cvId}`);
      if (res.data.success) {
        showToast('CV Removed', 'CV profile updated.', 'cyan');
        await refreshProfile();
      }
    } catch (err) {
      showToast('Error', 'Failed to remove CV.', 'amber');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rizwan's Developer Profile & Credentials */}
        <div className="glass-panel p-5 rounded-xl space-y-4 border border-slate-800">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-base text-white">Agent Sender Identity</h3>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Verified Candidate
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Full Name & Professional Handle
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-dark-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-emerald-500 outline-none"
                  placeholder="Full Name"
                />
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="bg-dark-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono focus:border-emerald-500 outline-none"
                  placeholder="Handle (e.g. Rizwan)"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Target Roles & Specializations (Comma-separated)
              </label>
              <input
                type="text"
                value={targetRoles}
                onChange={(e) => setTargetRoles(e.target.value)}
                className="w-full bg-dark-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Primary Tech Stack Keywords (LLM Match Tokens)
              </label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-dark-900 border border-slate-800 rounded-lg">
                <span className="px-2 py-0.5 text-xs rounded bg-slate-800 text-emerald-400 border border-slate-700">React.js</span>
                <span className="px-2 py-0.5 text-xs rounded bg-slate-800 text-emerald-400 border border-slate-700">Node.js</span>
                <span className="px-2 py-0.5 text-xs rounded bg-slate-800 text-emerald-400 border border-slate-700">Express.js</span>
                <span className="px-2 py-0.5 text-xs rounded bg-slate-800 text-emerald-400 border border-slate-700">MongoDB</span>
                <span className="px-2 py-0.5 text-xs rounded bg-slate-800 text-emerald-400 border border-slate-700">React Native</span>
                <span className="px-2 py-0.5 text-xs rounded bg-slate-800 text-cyan-400 border border-slate-700">Tailwind CSS</span>
                <span className="px-2 py-0.5 text-xs rounded bg-slate-800 text-cyan-400 border border-slate-700">TypeScript</span>
                <span className="px-2 py-0.5 text-xs rounded bg-slate-800 text-cyan-400 border border-slate-700">REST APIs</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Portfolio Link</label>
                <input
                  type="text"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  className="w-full bg-dark-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Direct WhatsApp (PK)</label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full bg-dark-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">LinkedIn Profile</label>
                <input
                  type="text"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="w-full bg-dark-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">GitHub Profile</label>
                <input
                  type="text"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="w-full bg-dark-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs font-mono focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pitch Template & Agent Rules */}
        <div className="glass-panel p-5 rounded-xl space-y-4 flex flex-col justify-between border border-slate-800">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Cpu className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-base text-white">Auto-Pitch AI Template</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Dynamic variables</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                WhatsApp & Direct Outreach Prompt
              </label>
              <textarea
                rows={7}
                value={pitchTemplate}
                onChange={(e) => setPitchTemplate(e.target.value)}
                className="w-full bg-dark-900 border border-slate-800 rounded-lg p-3 text-slate-200 text-xs font-mono leading-relaxed focus:border-emerald-500 outline-none resize-none"
              />
            </div>

            <div className="bg-dark-900 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Min. Match Threshold to Auto-Send</span>
                <span className="font-mono text-emerald-400 font-bold">{threshold}%</span>
              </div>
              <input
                type="range"
                min="60"
                max="95"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Opportunities scoring below {threshold}% are flagged for "Review Needed" rather than auto-dispatched.
              </p>
            </div>
          </div>

          <div className="pt-3">
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Agent Preferences
            </button>
          </div>
        </div>
      </div>

      {/* CV UPLOAD & MULTI-VERSION MANAGEMENT */}
      <div className="glass-panel p-5 rounded-xl space-y-4 border border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-rose-400" />
            <h3 className="font-bold text-sm text-white">Curriculum Vitae (CV) Profile Management</h3>
          </div>
          <span className="text-xs text-slate-400">PDF & DOCX accepted</span>
        </div>

        {/* Existing CV list */}
        <div className="space-y-2">
          {user?.cvs && user.cvs.length > 0 ? (
            user.cvs.map((cv) => (
              <div
                key={cv._id}
                className="flex items-center justify-between p-3 bg-dark-900 rounded-lg border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-rose-400" />
                  <div>
                    <span className="font-bold text-white block">{cv.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Category: {cv.category} &bull; {(cv.filesize / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {cv.isDefault && (
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                      Default Attached
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteCV(cv._id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                    title="Delete CV"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 bg-dark-900 rounded-lg border border-slate-800/80 text-center text-xs text-slate-400">
              No verified CV attached yet. Upload your real CV below so RizAgent can attach it to applications.
            </div>
          )}
        </div>

        {/* Upload Form */}
        <form onSubmit={handleUploadCV} className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Select CV File (PDF / DOCX)</label>
            <input
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={(e) => setCvFile(e.target.files ? e.target.files[0] : null)}
              className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Target Profile Track</label>
            <select
              value={cvCategory}
              onChange={(e) => setCvCategory(e.target.value as any)}
              className="w-full bg-dark-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 text-xs outline-none focus:border-emerald-500"
            >
              <option value="Full Stack / MERN">Full Stack / MERN</option>
              <option value="React / Frontend">React / Frontend</option>
              <option value="React Native / Mobile">React Native / Mobile</option>
              <option value="Internship / Junior">Internship / Junior</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isUploadingCV || !cvFile}
            className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
          >
            {isUploadingCV ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Upload Verified CV
          </button>
        </form>
      </div>
    </div>
  );
};

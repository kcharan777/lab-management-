import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import Canvas3DBackground from '../components/common/Canvas3DBackground';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const isExpired = new URLSearchParams(location.search).get('expired');
  const isReset = new URLSearchParams(location.search).get('reset');

  // Quick Demo Role Credentials for 1-click evaluation
  const demoAccounts = [
    { role: 'MAIN_ADMIN', label: 'Admin', email: 'admin@mlrit.ac.in', icon: 'shield_person' },
    { role: 'LAB_INCHARGE', label: 'In-Charge', email: 'ravi@mlrit.ac.in', icon: 'biotech' },
    { role: 'HOD', label: 'HOD', email: 'hod.cse@testsuite.edu', icon: 'account_balance' },
    { role: 'REPAIR_ASSISTANT', label: 'Tech', email: 'assistant.test@testsuite.edu', icon: 'build_circle' },
    { role: 'STUDENT', label: 'Student', email: '24r21a66f2@mlrit.ac.in', icon: 'school' },
  ];

  const handleSelectDemo = (account) => {
    setEmail(account.email);
    setPassword('Password123!');
    addToast(`Selected demo account: ${account.label}`, 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedInUser = await login(email, password);
      // Route based on role
      switch (loggedInUser.role) {
        case 'MAIN_ADMIN':
          navigate('/admin-console');
          break;
        case 'HOD':
          navigate('/hod-queue');
          break;
        case 'LAB_INCHARGE':
          navigate('/lab-incharge-queue');
          break;
        case 'REPAIR_ASSISTANT':
          navigate('/repair-assistant');
          break;
        default:
          navigate('/student-hub');
          break;
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#050814] text-white flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* 1. Large-Scale 3D Canvas Background */}
      <Canvas3DBackground />

      {/* 2. Ambient Cybernetic Light Spotlights */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-blue-600/12 blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] left-[25%] w-[450px] h-[450px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-[20%] right-[25%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[140px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '2.5s' }} />

      {/* 3. Subtle Cybernetic Perspective Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '56px 56px',
        }}
      />

      {/* 4. Perfectly Centered Login Card */}
      <div className="relative z-10 w-full max-w-md mx-auto my-auto animate-in fade-in zoom-in-95 duration-500">
        <div className="glass-card-premium rounded-3xl p-7 sm:p-9 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85),0_0_50px_rgba(59,130,246,0.2)] border border-slate-700/60 overflow-hidden relative">
          
          {/* Top specular glow highlight */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

          {/* Logo & Header */}
          <div className="text-center space-y-3 mb-7">
            <div className="inline-flex items-center justify-center">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-[2px] shadow-[0_0_25px_rgba(37,99,235,0.55)]">
                <div className="w-full h-full bg-[#080d1e] rounded-[14px] flex items-center justify-center">
                  <img src="/logo.svg" alt="LabPulse Logo" className="h-7 w-7" />
                </div>
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono tracking-wider mb-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span>CAMPUS OPERATIONS ACTIVE</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                LabPulse
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                MLR Institute of Technology • Operations Console
              </p>
            </div>
          </div>

          {/* Alert Banners */}
          {isReset && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-emerald-400 shrink-0">check_circle</span>
              <span>Password reset successfully. Sign in with your new password.</span>
            </div>
          )}

          {isExpired && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-amber-400 shrink-0">timer</span>
              <span>Your session expired. Please sign in again.</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-xs flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-red-400 shrink-0 mt-0.5">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label className="block text-[11px] font-mono uppercase font-bold tracking-wider text-slate-300 mb-1.5" htmlFor="email">
                Institutional Email / User ID
              </label>
              <div className="relative group">
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@mlrit.ac.in"
                  className="w-full bg-slate-950/70 text-white placeholder-slate-500 text-sm rounded-xl py-3 pl-10 pr-4 border border-slate-700/80 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                />
                <span className="material-symbols-outlined absolute left-3 top-3 text-slate-500 group-focus-within:text-blue-400 transition-colors text-[20px]">
                  alternate_email
                </span>
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-mono uppercase font-bold tracking-wider text-slate-300" htmlFor="password">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 hover:underline transition-colors focus:outline-none"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative group">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/70 text-white placeholder-slate-500 text-sm rounded-xl py-3 pl-10 pr-11 border border-slate-700/80 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                />
                <span className="material-symbols-outlined absolute left-3 top-3 text-slate-500 group-focus-within:text-blue-400 transition-colors text-[20px]">
                  lock
                </span>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-slate-800"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full relative overflow-hidden group py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] transition-all duration-200 shadow-[0_0_25px_rgba(37,99,235,0.4)] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {/* Shimmer wave effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[19px]">login</span>
                  <span>Enter Operations Console</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Bar */}
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-slate-400">
                1-Click Demo Accounts:
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleSelectDemo(acc)}
                  className="px-1.5 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-blue-400/60 text-slate-300 text-[10px] font-medium flex flex-col items-center gap-1 transition-all cursor-pointer hover:shadow-[0_0_12px_rgba(59,130,246,0.25)] active:scale-95"
                  title={`Fill ${acc.label} credentials`}
                >
                  <span className="material-symbols-outlined text-[14px] text-blue-400">
                    {acc.icon}
                  </span>
                  <span className="truncate max-w-full font-mono text-[9px]">{acc.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Register Action */}
          <div className="mt-4 pt-3 border-t border-slate-800/60 text-center">
            <p className="text-xs text-slate-400">
              Need a student account?{' '}
              <Link
                to="/register"
                className="text-cyan-400 hover:text-cyan-300 font-bold hover:underline transition-colors inline-flex items-center gap-0.5 ml-1"
              >
                <span>Register with Roll Number</span>
                <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
              </Link>
            </p>
          </div>

          {/* Security Tag */}
          <div className="mt-3 text-center text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-[13px] text-emerald-400">verified_user</span>
            <span>256-Bit TLS Encrypted • MLRIT Identity Governance</span>
          </div>
        </div>
      </div>
    </div>
  );
}

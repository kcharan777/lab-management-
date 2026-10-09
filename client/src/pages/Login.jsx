import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isExpired = new URLSearchParams(location.search).get('expired');
  const isReset = new URLSearchParams(location.search).get('reset');

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
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center gap-3 justify-center mb-4">
          <img src="/logo.svg" alt="LabPulse" className="h-12 w-12" />
          <div className="flex flex-col text-left">
            <span className="font-headline-xl text-primary font-bold tracking-tight leading-none">LabPulse</span>
            <span className="text-[11px] font-mono text-secondary tracking-wider uppercase mt-1">MLRIT Campus Operations</span>
          </div>
        </div>
        <h2 className="font-headline-md text-on-surface font-bold tracking-tight">
          Campus Operations Console
        </h2>
        <p className="mt-1 text-body-sm text-secondary font-medium">
          Sign in with your institutional credentials
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface-container-lowest py-8 px-6 shadow-md rounded-xl border border-outline-variant/30 sm:px-10">
          {isReset && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Password reset successful! Please sign in with your new password.
            </div>
          )}

          {isExpired && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">info</span>
              Your session has expired. Please sign in again.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3.5 bg-error-container text-on-error-container rounded-lg text-body-sm flex items-start gap-2 border border-error/20">
              <span className="material-symbols-outlined text-[18px] text-error shrink-0">error</span>
              <div>{error}</div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block font-label-md text-secondary uppercase font-bold tracking-wide" htmlFor="email">
                Institutional Email
              </label>
              <div className="mt-1 relative">
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@mlrit.ac.in"
                  className="w-full bg-surface-container-low text-on-surface font-body-md rounded-lg p-3 pl-10 border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                />
                <span className="material-symbols-outlined absolute left-3 top-3 text-secondary text-[20px]">
                  alternate_email
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block font-label-md text-secondary uppercase font-bold tracking-wide" htmlFor="password">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[12px] font-semibold text-primary hover:underline focus:outline-none"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="mt-1 relative">
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-surface-container-low text-on-surface font-body-md rounded-lg p-3 pl-10 border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                />
                <span className="material-symbols-outlined absolute left-3 top-3 text-secondary text-[20px]">
                  lock
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-tactile-primary py-3 rounded-lg font-semibold text-body-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  <span>Enter Operations Console</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-outline-variant/30 text-center">
            <p className="text-body-sm text-secondary">
              Need a student account?{' '}
              <Link to="/register" className="text-primary font-bold hover:underline">
                Register with Roll Number
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Extract token from query string
  const token = new URLSearchParams(location.search).get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Password reset token is missing from the URL. Please re-open the link from your email.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters in length.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter identical passwords.');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, newPassword);
      navigate('/login?reset=1');
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired or was already consumed.');
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
            <span className="text-[11px] font-mono text-secondary tracking-wider uppercase mt-1">Campus Security Dispatch</span>
          </div>
        </div>
        <h2 className="font-headline-md text-on-surface font-bold tracking-tight">
          Establish New Password
        </h2>
        <p className="mt-1 text-body-sm text-secondary font-medium">
          Create a secure password for your institutional account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface-container-lowest py-8 px-6 shadow-md rounded-xl border border-outline-variant/30 sm:px-10">
          {!token ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
                <span className="material-symbols-outlined text-[28px]">link_off</span>
              </div>
              <h3 className="font-bold text-on-surface">Invalid Reset Link</h3>
              <p className="text-body-sm text-secondary">
                No reset token found in this link. Please request a new password reset link.
              </p>
              <Link
                to="/forgot-password"
                className="w-full btn-tactile-primary py-2.5 rounded-lg font-semibold text-body-sm flex items-center justify-center gap-2"
              >
                Request New Reset Link
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3.5 bg-error-container text-on-error-container rounded-lg text-body-sm flex items-start gap-2 border border-error/20">
                  <span className="material-symbols-outlined text-[18px] text-error shrink-0">error</span>
                  <div>{error}</div>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block font-label-md text-secondary uppercase font-bold tracking-wide" htmlFor="newPassword">
                    New Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="newPassword"
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full bg-surface-container-low text-on-surface font-body-md rounded-lg p-3 pl-10 border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-3 text-secondary text-[20px]">
                      lock
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-label-md text-secondary uppercase font-bold tracking-wide" htmlFor="confirmPassword">
                    Confirm New Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="confirmPassword"
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full bg-surface-container-low text-on-surface font-body-md rounded-lg p-3 pl-10 border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                    />
                    <span className="material-symbols-outlined absolute left-3 top-3 text-secondary text-[20px]">
                      lock_reset
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full btn-tactile-primary py-3 rounded-lg font-semibold text-body-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">key</span>
                      <span>Update Password & Sign In</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-outline-variant/30 text-center">
                <Link to="/login" className="text-body-sm text-primary font-bold hover:underline inline-flex items-center gap-1">
                  Cancel & Return to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

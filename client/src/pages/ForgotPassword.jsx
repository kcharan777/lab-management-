import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { forgotPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Unable to process password reset request.');
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
          Reset Institutional Password
        </h2>
        <p className="mt-1 text-body-sm text-secondary font-medium">
          Enter your registered email to receive a secure, short-lived reset link
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface-container-lowest py-8 px-6 shadow-md rounded-xl border border-outline-variant/30 sm:px-10">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <span className="material-symbols-outlined text-[32px]">mark_email_read</span>
              </div>
              <h3 className="text-headline-sm font-bold text-on-surface">Instructions Dispatched</h3>
              <p className="text-body-sm text-secondary leading-relaxed">
                If an authorized account is associated with <strong>{email}</strong>, a single-use password reset link valid for <strong>15 minutes</strong> has been generated.
              </p>
              <div className="p-3 bg-surface-container-low rounded-lg text-[12px] text-secondary border border-outline-variant/40">
                <p className="font-semibold text-on-surface mb-1">Notice for College Environment:</p>
                <p>If SMTP/Gmail credentials are active, an email has been delivered to your inbox. In local testing, instructions are mirrored in the application terminal.</p>
              </div>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="w-full btn-tactile-primary py-2.5 rounded-lg font-semibold text-body-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3.5 bg-error-container text-on-error-container rounded-lg text-body-sm flex items-start gap-2 border border-error/20">
                  <span className="material-symbols-outlined text-[18px] text-error shrink-0">error</span>
                  <div>{error}</div>
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label className="block font-label-md text-secondary uppercase font-bold tracking-wide" htmlFor="email">
                    Institutional Email Address
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-tactile-primary py-3 rounded-lg font-semibold text-body-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Dispatching Link...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      <span>Send Password Reset Link</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-outline-variant/30 text-center">
                <Link to="/login" className="text-body-sm text-primary font-bold hover:underline inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

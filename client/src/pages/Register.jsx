import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
    department: 'Computer Science & Engineering',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const newUser = await register(formData);
      if (newUser.role === 'MAIN_ADMIN') {
        navigate('/admin-console');
      } else if (newUser.role === 'HOD') {
        navigate('/hod-queue');
      } else if (newUser.role === 'LAB_INCHARGE') {
        navigate('/lab-incharge-queue');
      } else {
        navigate('/student-hub');
      }
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center gap-3 justify-center mb-4">
          <img src="/logo.svg" alt="LabPulse" className="h-12 w-12" />
          <span className="font-headline-xl text-primary font-bold tracking-tight">LabPulse</span>
        </div>
        <h2 className="font-headline-md text-on-surface font-bold tracking-tight">
          Create Authorized Campus Account
        </h2>
        <p className="mt-1 text-body-sm text-secondary font-medium">
          Register with your institutional role for lab grievance routing
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface-container-lowest py-8 px-6 shadow-md rounded-xl border border-outline-variant/30 sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-error-container text-on-error-container rounded text-body-sm flex items-center gap-2 border border-error/20">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block font-label-md text-secondary uppercase font-bold tracking-wide" htmlFor="name">
                Full Legal Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Dr. / Prof. / Student Name"
                className="mt-1 w-full bg-surface-container-low text-on-surface font-body-md rounded p-3 border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
              />
            </div>

            <div>
              <label className="block font-label-md text-secondary uppercase font-bold tracking-wide" htmlFor="email">
                Institutional Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="user@college.edu"
                className="mt-1 w-full bg-surface-container-low text-on-surface font-body-md rounded p-3 border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
              />
            </div>

            <div>
              <label className="block font-label-md text-secondary uppercase font-bold tracking-wide" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength="6"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                className="mt-1 w-full bg-surface-container-low text-on-surface font-body-md rounded p-3 border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-label-md text-secondary uppercase font-bold tracking-wide" htmlFor="role">
                  System Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="mt-1 w-full bg-surface-container-low text-on-surface font-body-md rounded p-3 border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner font-medium"
                >
                  <option value="STUDENT">STUDENT</option>
                  <option value="HOD">HOD</option>
                  <option value="LAB_INCHARGE">LAB INCHARGE</option>
                  <option value="MAIN_ADMIN">MAIN ADMIN</option>
                </select>
              </div>

              <div>
                <label className="block font-label-md text-secondary uppercase font-bold tracking-wide" htmlFor="department">
                  Department
                </label>
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="mt-1 w-full bg-surface-container-low text-on-surface font-body-md rounded p-3 border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner font-medium"
                >
                  <option value="Computer Science & Engineering">CSE</option>
                  <option value="Information Technology">IT</option>
                  <option value="Electronics & Communication">ECE</option>
                  <option value="Electrical & Electronics">EEE</option>
                  <option value="Mechanical Engineering">MECH</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full btn-tactile-primary py-3 rounded font-semibold text-body-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-outline-variant/30 text-center">
            <p className="text-body-sm text-secondary">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-bold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

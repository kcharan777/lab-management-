import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/adminService';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    rollNumber: '',
    department: 'Computer Science & Engineering',
  });

  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Fetch departments dynamically from backend
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await adminService.getDepartments();
        if (res.success && res.data && res.data.length > 0) {
          setDepartments(res.data);
          const defaultDept = res.data[0];
          setFormData((prev) => ({
            ...prev,
            department: defaultDept.name,
          }));
        }
      } catch (err) {
        console.warn('Could not load dynamic departments, using baseline:', err.message);
      }
    };
    fetchDepts();
  }, []);

  const handleDepartmentChange = (e) => {
    setFormData({
      ...formData,
      department: e.target.value,
    });
  };

  const handleChange = (e) => {
    let value = e.target.value;
    if (e.target.name === 'rollNumber') {
      value = value.toUpperCase().trim();
    }
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Pre-flight validation of roll number format
    const roll = formData.rollNumber.trim().toUpperCase();
    if (roll.length !== 10) {
      setError(`Roll number must be exactly 10 alphanumeric characters (e.g., 24R21A66J9). Current length: ${roll.length}`);
      return;
    }

    if (!roll.includes('R2')) {
      setError(`Roll number must contain the official MLRIT institution code 'R2' (e.g., 24R21A66J9).`);
      return;
    }

    setLoading(true);

    try {
      // Role is hardcoded to STUDENT for public registration
      await register({
        ...formData,
        rollNumber: roll,
        role: 'STUDENT',
      });
      navigate('/student-hub');
    } catch (err) {
      setError(err.message || 'Student registration failed.');
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
            <span className="text-[11px] font-mono text-secondary tracking-wider uppercase mt-1">MLRIT Campus Grid</span>
          </div>
        </div>
        <h2 className="font-headline-md text-on-surface font-bold tracking-tight">
          Student Portal Registration
        </h2>
        <p className="mt-1 text-body-sm text-secondary font-medium">
          Create verified student account using your official MLRIT roll number
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-surface-container-lowest py-8 px-6 shadow-md rounded-xl border border-outline-variant/30 sm:px-10">
          {error && (
            <div className="mb-4 p-3.5 bg-error-container text-on-error-container rounded-lg text-body-sm flex items-start gap-2.5 border border-error/20">
              <span className="material-symbols-outlined text-[20px] text-error shrink-0">error</span>
              <div className="leading-snug">{error}</div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Roll Number Verification Field */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block font-label-md text-secondary uppercase font-bold tracking-wide" htmlFor="rollNumber">
                  MLRIT Roll Number <span className="text-error">*</span>
                </label>
                <span className="text-[11px] text-primary font-mono font-medium">Format: 24R21A66J9</span>
              </div>
              <div className="mt-1 relative">
                <input
                  id="rollNumber"
                  name="rollNumber"
                  type="text"
                  required
                  maxLength={10}
                  value={formData.rollNumber}
                  onChange={handleChange}
                  placeholder="e.g. 24R21A66J9"
                  className="w-full bg-surface-container-low text-on-surface font-mono text-body-md rounded-lg p-3 pl-10 border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner tracking-wider uppercase"
                />
                <span className="material-symbols-outlined absolute left-3 top-3 text-secondary text-[20px]">
                  badge
                </span>
              </div>
              <p className="mt-1 text-[11px] text-secondary">
                Official MLRIT 10-digit roll code (Year + R2 + Degree + Branch + Suffix)
              </p>
            </div>

            {/* Student Full Name */}
            <div>
              <label className="block font-label-md text-secondary uppercase font-bold tracking-wide" htmlFor="name">
                Full Legal Name <span className="text-error">*</span>
              </label>
              <div className="mt-1 relative">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="As per college records"
                  className="w-full bg-surface-container-low text-on-surface font-body-md rounded-lg p-3 pl-10 border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                />
                <span className="material-symbols-outlined absolute left-3 top-3 text-secondary text-[20px]">
                  person
                </span>
              </div>
            </div>

            {/* Institutional Email */}
            <div>
              <label className="block font-label-md text-secondary uppercase font-bold tracking-wide" htmlFor="email">
                College / Institutional Email <span className="text-error">*</span>
              </label>
              <div className="mt-1 relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="student@mlrit.ac.in"
                  className="w-full bg-surface-container-low text-on-surface font-body-md rounded-lg p-3 pl-10 border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                />
                <span className="material-symbols-outlined absolute left-3 top-3 text-secondary text-[20px]">
                  alternate_email
                </span>
              </div>
            </div>

            {/* Department Selection */}
            <div>
              <label className="block font-label-md text-secondary uppercase font-bold tracking-wide" htmlFor="department">
                Department <span className="text-error">*</span>
              </label>
              <div className="mt-1 relative">
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleDepartmentChange}
                  className="w-full bg-surface-container-low text-on-surface font-body-md rounded-lg p-3 pl-10 border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner font-medium"
                >
                  {departments.length > 0 ? (
                    departments.map((d) => (
                      <option key={d._id || d.code} value={d.name}>
                        {d.code} — {d.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Computer Science & Engineering">CSE — Computer Science</option>
                      <option value="CSE - Artificial Intelligence & Machine Learning">CSM — AI & ML</option>
                      <option value="CSE - Data Science">CSD — Data Science</option>
                      <option value="CSE - Cyber Security">CSC — Cyber Security</option>
                      <option value="Information Technology">IT — Information Technology</option>
                      <option value="Electronics & Communication Engineering">ECE — Electronics</option>
                      <option value="Electrical & Electronics Engineering">EEE — Electrical</option>
                      <option value="Mechanical Engineering">MECH — Mechanical</option>
                      <option value="Civil Engineering">CIVIL — Civil</option>
                    </>
                  )}
                </select>
                <span className="material-symbols-outlined absolute left-3 top-3 text-secondary text-[20px]">
                  domain
                </span>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block font-label-md text-secondary uppercase font-bold tracking-wide" htmlFor="password">
                Password <span className="text-error">*</span>
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength="6"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
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
              className="mt-2 w-full btn-tactile-primary py-3 rounded-lg font-semibold text-body-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                  <span>Verify Roll & Create Student Account</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-outline-variant/30 text-center space-y-2">
            <p className="text-body-sm text-secondary">
              Already verified?{' '}
              <Link to="/login" className="text-primary font-bold hover:underline">
                Sign in to Console
              </Link>
            </p>
            <p className="text-[12px] text-secondary">
              Faculty, HOD, and Staff accounts are provisioned by the Administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

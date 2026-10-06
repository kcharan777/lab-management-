import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { complaintService } from '../services/complaintService';

export default function RaiseIssue() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState({
    labName: 'Advanced AI & Machine Learning Lab (Lab 402 - Block B)',
    systemNumber: '',
    issueCategory: 'HARDWARE',
    priority: 'MEDIUM',
    description: '',
    remarks: '',
    imageUrl: '',
  });

  const [imagePreview, setImagePreview] = useState(null);

  const labOptions = [
    'Advanced AI & Machine Learning Lab (Lab 402 - Block B)',
    'VLSI Design & Embedded Systems Lab (Lab 201 - Tech Tower)',
    'Networks & Cyber Security Lab (Lab 305 - Core Wing)',
    'Physics & Precision Optics Lab (Lab 102 - Science Quad)',
    'IoT & Embedded Systems Lab (IoT 304 - Innovation Hub)',
  ];

  const categories = [
    { id: 'HARDWARE', label: 'Hardware Defect', icon: 'memory' },
    { id: 'SOFTWARE', label: 'OS / Software / Drivers', icon: 'code' },
    { id: 'NETWORK', label: 'Network & Port Link', icon: 'lan' },
    { id: 'POWER_ELECTRICAL', label: 'Power & Smells', icon: 'bolt' },
    { id: 'PERIPHERAL', label: 'Monitor / Keyboard / Mouse', icon: 'mouse' },
    { id: 'OTHER', label: 'Other Diagnostics', icon: 'help_outline' },
  ];

  const priorities = [
    { id: 'LOW', label: 'Low', desc: 'Minor issue' },
    { id: 'MEDIUM', label: 'Medium', desc: 'Affects regular lab tasks' },
    { id: 'HIGH', label: 'High', desc: 'Lab work blocked' },
    { id: 'CRITICAL', label: 'Critical', desc: 'Urgent exam / capstone deadline' },
  ];

  const quickStations = ['ML-WS-02', 'ML-WS-14', 'VLSI-08', 'NET-CORE-01', 'IOT-KIT-04'];

  const handleImageFile = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Please upload a valid image file (.png, .jpg, .jpeg, .webp)', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast('Image size exceeds 5MB limit', 'error');
      return;
    }

    // Local preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    // Upload to backend/Cloudinary
    try {
      setUploadingImage(true);
      const res = await complaintService.uploadEvidenceImage(file);
      if (res.success && res.data?.imageUrl) {
        setFormData((prev) => ({ ...prev, imageUrl: res.data.imageUrl }));
        addToast('Evidence photograph uploaded successfully', 'success');
      }
    } catch (err) {
      addToast(err.message || 'Image upload failed', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.systemNumber.trim()) {
      addToast('Please enter the equipment / workstation ID', 'warning');
      return;
    }

    if (!formData.description.trim() || formData.description.trim().length < 5) {
      addToast('Please provide an issue description (minimum 5 characters)', 'warning');
      return;
    }

    try {
      setLoading(true);
      const res = await complaintService.createComplaint(formData);
      if (res.success && res.data) {
        addToast(`Grievance ${res.data.complaintId} created & routed for HOD verification!`, 'success');
        navigate('/student-hub');
      }
    } catch (err) {
      addToast(err.message || 'Failed to submit grievance', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-space-md lg:px-margin py-space-md space-y-space-lg">
      {/* Breadcrumb & Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-sm border-b border-outline-variant/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-label-md font-label-md text-secondary">
            <span className="hover:text-primary cursor-pointer">Student Portal</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-semibold">New Grievance Filing</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="bg-surface-container-high px-2 py-0.5 rounded text-on-surface-variant font-mono">
              FORM-REF #CMP-DEV
            </span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">
            Report Laboratory Equipment Issue
          </h1>
          <p className="font-body-md text-body-md text-secondary max-w-3xl">
            Upload photographic evidence and detailed system specs for fast-track HOD and Lab Incharge verification. Direct routing into campus repair ops.
          </p>
        </div>

        {/* Live Bench Session Badge */}
        <div className="flex items-center gap-3 bg-surface-container-lowest p-2.5 rounded-lg shadow-sm border border-outline-variant/30 self-start md:self-auto">
          <div className="w-10 h-10 rounded bg-primary-container/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[24px]">terminal</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-secondary uppercase font-bold">Active Student</span>
            <span className="font-label-md text-label-md font-semibold text-on-surface">
              {user?.name || 'Student'} ({user?.department || 'Engineering'})
            </span>
          </div>
        </div>
      </div>

      {/* Stepper Progress Bar matching Stitch */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => setActiveStep(1)}
            className={`flex items-center gap-3.5 p-2 rounded cursor-pointer transition-all ${
              activeStep === 1 ? 'bg-surface-container-low border-b-2 border-primary' : 'hover:bg-surface-container-low/50'
            }`}
          >
            <div className="w-8 h-8 rounded flex items-center justify-center font-label-md font-bold text-on-primary bg-primary shadow-sm">
              <span className="material-symbols-outlined text-[18px]">domain</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm uppercase font-bold text-primary tracking-wider">
                Step 01 • Target
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">
                System Identification
              </span>
            </div>
          </div>

          <div
            onClick={() => setActiveStep(2)}
            className={`flex items-center gap-3.5 p-2 rounded cursor-pointer transition-all ${
              activeStep === 2 ? 'bg-surface-container-low border-b-2 border-primary' : 'hover:bg-surface-container-low/50'
            }`}
          >
            <div className="w-8 h-8 rounded flex items-center justify-center font-label-md font-bold text-on-primary-container bg-primary-fixed shadow-sm">
              <span className="material-symbols-outlined text-[18px]">photo_camera</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm uppercase font-bold text-secondary tracking-wider">
                Step 02 • Evidence
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">
                Diagnostics & Upload
              </span>
            </div>
          </div>

          <div
            onClick={() => setActiveStep(3)}
            className={`flex items-center gap-3.5 p-2 rounded cursor-pointer transition-all ${
              activeStep === 3 ? 'bg-surface-container-low border-b-2 border-primary' : 'hover:bg-surface-container-low/50'
            }`}
          >
            <div className="w-8 h-8 rounded flex items-center justify-center font-label-md font-bold text-secondary bg-surface-container-highest shadow-sm">
              <span className="material-symbols-outlined text-[18px]">send</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm uppercase font-bold text-secondary tracking-wider">
                Step 03 • Escalation
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">
                Review & Dispatch
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Workstation Studio Grid */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* LEFT COLUMN: System Identification, Category, Priority (7 Cols) */}
        <div className="lg:col-span-7 space-y-space-md">
          {/* Panel 1: Laboratory Facility */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 space-y-space-md">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">domain</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  1. Location & Terminal Target
                </h2>
              </div>
              <span className="font-label-sm text-label-sm text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono font-bold uppercase">
                Grid Online
              </span>
            </div>

            {/* Lab Dropdown Selection */}
            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-secondary uppercase font-bold tracking-wide" htmlFor="lab-selection">
                Allocated Lab Facility
              </label>
              <div className="relative">
                <select
                  id="lab-selection"
                  value={formData.labName}
                  onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface font-body-md rounded p-3 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-primary shadow-inner font-medium border border-outline-variant/50"
                >
                  {labOptions.map((lab) => (
                    <option key={lab} value={lab}>
                      {lab}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-3.5 text-secondary pointer-events-none text-[20px]">
                  expand_more
                </span>
              </div>
            </div>

            {/* Workstation Node ID */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="font-label-md text-label-md text-secondary uppercase font-bold tracking-wide" htmlFor="system-id">
                  Equipment ID / Workstation Node
                </label>
                <span className="font-label-sm text-label-sm text-tertiary font-mono bg-tertiary-fixed/30 px-2 py-0.5 rounded">
                  Required
                </span>
              </div>
              <input
                id="system-id"
                type="text"
                required
                value={formData.systemNumber}
                onChange={(e) => setFormData({ ...formData, systemNumber: e.target.value })}
                placeholder="e.g. ML-WS-14 or FPGA-KIT-02"
                className="w-full bg-surface-container-low text-on-surface font-body-md font-mono rounded p-3 border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
              />

              {/* Quick Matrix Selector Pills */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="font-label-sm text-[11px] text-secondary">Quick Select:</span>
                {quickStations.map((station) => (
                  <button
                    key={station}
                    type="button"
                    onClick={() => setFormData({ ...formData, systemNumber: station })}
                    className="font-label-sm text-[11px] font-mono px-2 py-0.5 rounded bg-surface-container hover:bg-primary hover:text-white transition-colors cursor-pointer border border-outline-variant/30"
                  >
                    {station}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Panel 2: Issue Classification & Priority */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 space-y-space-md">
            <div className="flex items-center gap-2 pb-2 border-b border-surface-container-high">
              <span className="material-symbols-outlined text-primary text-[22px]">category</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                2. Classification & Urgency
              </h2>
            </div>

            {/* Issue Category Grid */}
            <div className="space-y-2">
              <label className="font-label-md text-label-md text-secondary uppercase font-bold tracking-wide">
                Issue Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((cat) => {
                  const isSelected = formData.issueCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, issueCategory: cat.id })}
                      className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                          : 'border-outline-variant/40 bg-surface-container-low hover:bg-surface-container'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[20px] ${isSelected ? 'text-primary' : 'text-secondary'}`}>
                        {cat.icon}
                      </span>
                      <span className={`font-body-sm text-[12px] font-bold ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority Selector */}
            <div className="space-y-2 pt-2">
              <label className="font-label-md text-label-md text-secondary uppercase font-bold tracking-wide">
                SLA Escalation Priority
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {priorities.map((p) => {
                  const isSelected = formData.priority === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: p.id })}
                      className={`p-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                        isSelected
                          ? p.id === 'CRITICAL'
                            ? 'bg-error text-white border-error shadow-sm font-bold'
                            : 'bg-primary text-white border-primary shadow-sm font-bold'
                          : 'bg-surface-container-low text-on-surface border-outline-variant/40 hover:bg-surface-container'
                      }`}
                    >
                      <span className="font-label-sm text-label-sm uppercase font-bold block">{p.label}</span>
                      <span className="font-body-sm text-[10px] opacity-80 block truncate">{p.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Diagnostics, Photographic Evidence & Submit (5 Cols) */}
        <div className="lg:col-span-5 space-y-space-md">
          {/* Panel 3: Technical Description */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 space-y-space-md">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">description</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  3. Diagnostic Description
                </h2>
              </div>
              <span className="font-label-sm text-label-sm text-secondary font-mono">
                {formData.description.length}/2000 chars
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-secondary uppercase font-bold tracking-wide" htmlFor="desc-input">
                Observed Fault & Error Codes
              </label>
              <textarea
                id="desc-input"
                rows="4"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe behavior, screen artifacts, thermal shutdown, beep codes, or software error messages..."
                className="w-full bg-surface-container-low text-on-surface font-body-md rounded p-3 border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-label-md text-label-md text-secondary uppercase font-bold tracking-wide" htmlFor="remarks-input">
                Additional Student Notes (Optional)
              </label>
              <input
                id="remarks-input"
                type="text"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="e.g. Happened during Capstone slot; system reboot loop."
                className="w-full bg-surface-container-low text-on-surface font-body-md rounded p-2.5 border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
              />
            </div>
          </div>

          {/* Panel 4: Photographic Evidence Dropzone */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 space-y-space-md">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">photo_camera</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  4. Photographic Evidence
                </h2>
              </div>
              <span className="font-label-sm text-label-sm text-secondary font-mono">Cloudinary Sec</span>
            </div>

            {/* Dropzone Box */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`p-6 border-2 border-dashed rounded-xl text-center transition-all ${
                imagePreview
                  ? 'border-emerald-500 bg-emerald-50/20'
                  : 'border-outline-variant/60 hover:border-primary bg-surface-container-low/50'
              }`}
            >
              {imagePreview ? (
                <div className="space-y-3">
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Uploaded Preview"
                      className="max-h-40 rounded-lg shadow-md border border-slate-300 mx-auto object-contain"
                    />
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-slate-900/60 rounded-lg flex items-center justify-center text-white text-xs font-bold gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Streaming to Cloud...
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setFormData((prev) => ({ ...prev, imageUrl: '' }));
                      }}
                      className="btn-tactile-danger px-3 py-1 rounded text-body-sm font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                      Remove Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="material-symbols-outlined text-secondary text-[36px]">add_photo_alternate</span>
                  <div className="font-body-sm text-body-sm text-on-surface font-medium">
                    Drag and drop defect photo here, or{' '}
                    <label className="text-primary font-bold hover:underline cursor-pointer">
                      browse files
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => handleImageFile(e.target.files?.[0])}
                      />
                    </label>
                  </div>
                  <p className="font-label-sm text-[11px] text-secondary">
                    Supports JPG, PNG, WEBP up to 5MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Submit Action Card */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 space-y-3">
            <button
              type="submit"
              disabled={loading || uploadingImage}
              className="w-full btn-tactile-primary py-3.5 rounded-lg font-bold text-body-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Escalating to HOD Queue...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">send</span>
                  <span>Submit Grievance to HOD Queue</span>
                </>
              )}
            </button>
            <p className="font-label-sm text-[11px] text-secondary text-center">
              Target SLA: 4.2 hours average campus turnaround. Live progress tracked on Student Hub.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

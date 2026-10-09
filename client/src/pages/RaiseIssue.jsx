import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { complaintService } from '../services/complaintService';
import { adminService } from '../services/adminService';

export default function RaiseIssue() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Dynamic Labs state
  const [labs, setLabs] = useState([]);
  const [labsLoading, setLabsLoading] = useState(true);
  const [selectedLabObj, setSelectedLabObj] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    labName: '',
    labId: '',
    department: user?.department || 'Computer Science & Engineering',
    systemNumber: '',
    issueCategory: 'HARDWARE',
    priority: 'MEDIUM',
    description: '',
    remarks: '',
    imageUrl: '',
  });

  const [imagePreview, setImagePreview] = useState(null);

  // Fetch labs dynamically from the backend (No hardcoded names/locations!)
  useEffect(() => {
    const fetchDynamicLabs = async () => {
      try {
        setLabsLoading(true);
        const res = await adminService.getLabs();
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setLabs(res.data);
          // Set initial default lab
          const firstLab = res.data[0];
          setSelectedLabObj(firstLab);
          setFormData((prev) => ({
            ...prev,
            labName: firstLab.name,
            labId: firstLab._id,
            department: firstLab.department || prev.department,
          }));
        } else {
          setLabs([]);
        }
      } catch (err) {
        console.warn('Failed to load dynamic labs:', err.message);
      } finally {
        setLabsLoading(false);
      }
    };

    fetchDynamicLabs();
  }, []);

  const handleLabChange = (e) => {
    const chosenLabId = e.target.value;
    const found = labs.find((l) => l._id === chosenLabId);
    if (found) {
      setSelectedLabObj(found);
      setFormData((prev) => ({
        ...prev,
        labId: found._id,
        labName: found.name,
        department: found.department,
      }));
    }
  };

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

    // Upload to backend
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

    if (!formData.labName) {
      addToast('Please select a laboratory', 'warning');
      return;
    }

    if (!formData.systemNumber.trim()) {
      addToast('Please enter the equipment / workstation ID', 'warning');
      return;
    }

    if (formData.description.trim().length < 5) {
      addToast('Please describe the problem (at least 5 characters)', 'warning');
      return;
    }

    setLoading(true);

    try {
      const res = await complaintService.createComplaint({
        ...formData,
        title: formData.title.trim() || `${formData.issueCategory} issue on ${formData.systemNumber.trim()} (${formData.labName})`,
      });

      if (res.success) {
        addToast(
          `Grievance logged successfully! Assigned ID: ${res.data.complaintId}. Forwarded to Lab In-Charge for verification.`,
          'success'
        );
        navigate('/student-hub');
      }
    } catch (err) {
      addToast(err.message || 'Failed to submit grievance', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-space-md lg:px-margin py-space-md space-y-space-lg">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-sm border-b border-outline-variant/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-label-md font-label-md text-secondary">
            <span>Student Hub</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-semibold">Step 1: Report Problem</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">
            Report Laboratory Technical Grievance
          </h1>
          <p className="font-body-md text-body-md text-secondary">
            Submissions route directly to the Lab In-Charge for hardware inspection and verification.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 bg-surface-container-low p-1.5 rounded-lg border border-outline-variant/40">
          {[1, 2, 3].map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setActiveStep(step)}
              className={`px-3 py-1 rounded text-label-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeStep === step
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span>{step}</span>
              <span className="hidden sm:inline">
                {step === 1 ? 'Location & Rig' : step === 2 ? 'Diagnostics' : 'Verification'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-space-lg">
        {/* STEP 1: Laboratory & Rig Identification */}
        {activeStep === 1 && (
          <div className="space-y-space-md animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/30 space-y-space-md shadow-xs">
              <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3">
                <span className="material-symbols-outlined text-primary text-[24px]">domain</span>
                <div>
                  <h3 className="font-headline-md text-on-surface font-bold">1. Laboratory Allocation & Location</h3>
                  <p className="font-body-sm text-secondary">Dynamically allocated campus laboratory facilities</p>
                </div>
              </div>

              {labsLoading ? (
                <div className="py-6 text-center text-secondary flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading campus laboratories...</span>
                </div>
              ) : labs.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-body-sm">
                  No laboratories currently configured. The Administrator will add laboratories in the console.
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block font-label-md text-secondary uppercase font-bold tracking-wide mb-1">
                      Select Laboratory Facility <span className="text-error">*</span>
                    </label>
                    <select
                      value={formData.labId}
                      onChange={handleLabChange}
                      className="w-full bg-surface-container-low text-on-surface font-body-md rounded-lg p-3 border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner font-medium"
                    >
                      {labs.map((lab) => (
                        <option key={lab._id} value={lab._id}>
                          [{lab.code}] {lab.name} — ({lab.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected Lab Location Card */}
                  {selectedLabObj && (
                    <div className="p-3.5 bg-surface-container-low rounded-lg border border-outline-variant/40 flex items-start justify-between gap-3 text-body-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-on-surface">{selectedLabObj.name}</span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                            {selectedLabObj.status}
                          </span>
                        </div>
                        <p className="text-secondary flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                          <span>{selectedLabObj.location}</span>
                        </p>
                      </div>
                      <div className="text-right text-secondary text-[12px] font-mono">
                        Dept: {selectedLabObj.department}
                      </div>
                    </div>
                  )}

                  {/* Equipment / Workstation ID */}
                  <div>
                    <label className="block font-label-md text-secondary uppercase font-bold tracking-wide mb-1" htmlFor="systemNumber">
                      Workstation / Equipment / Bench ID <span className="text-error">*</span>
                    </label>
                    <input
                      id="systemNumber"
                      type="text"
                      required
                      placeholder="e.g. WS-04, RIG-12, BENCH-02, OSC-01"
                      value={formData.systemNumber}
                      onChange={(e) => setFormData({ ...formData, systemNumber: e.target.value.toUpperCase() })}
                      className="w-full bg-surface-container-low text-on-surface font-mono font-bold text-body-md rounded-lg p-3 border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner tracking-wider"
                    />
                    <p className="mt-1 text-[11px] text-secondary">
                      Enter the labeled sticker number on the machine, monitor, or oscilloscope
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!formData.systemNumber.trim()) {
                    addToast('Please enter the workstation or equipment ID', 'warning');
                    return;
                  }
                  setActiveStep(2);
                }}
                className="btn-tactile-primary px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 cursor-pointer"
              >
                <span>Proceed to Diagnostics</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Issue Diagnostics & Details */}
        {activeStep === 2 && (
          <div className="space-y-space-md animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/30 space-y-space-md shadow-xs">
              <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3">
                <span className="material-symbols-outlined text-primary text-[24px]">construction</span>
                <div>
                  <h3 className="font-headline-md text-on-surface font-bold">2. Technical Diagnostics & Severity</h3>
                  <p className="font-body-sm text-secondary">Categorize the failure mode for appropriate routing</p>
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block font-label-md text-secondary uppercase font-bold tracking-wide mb-2">
                  Failure Category <span className="text-error">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, issueCategory: cat.id })}
                      className={`p-3 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        formData.issueCategory === cat.id
                          ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                          : 'bg-surface-container-low border-outline-variant/40 text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{cat.icon}</span>
                      <span className="text-body-sm">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block font-label-md text-secondary uppercase font-bold tracking-wide mb-2">
                  Priority / Impact Level
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {priorities.map((pri) => (
                    <button
                      key={pri.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: pri.id })}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        formData.priority === pri.id
                          ? pri.id === 'CRITICAL'
                            ? 'bg-error/10 border-error text-error font-bold'
                            : 'bg-primary/10 border-primary text-primary font-bold'
                          : 'bg-surface-container-low border-outline-variant/40 text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      <div className="text-body-sm font-semibold">{pri.label}</div>
                      <div className="text-[11px] text-secondary mt-0.5">{pri.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block font-label-md text-secondary uppercase font-bold tracking-wide mb-1" htmlFor="description">
                  Symptom Description & Error Messages <span className="text-error">*</span>
                </label>
                <textarea
                  id="description"
                  required
                  rows={4}
                  placeholder="Provide precise details: Did the system BSOD? Is smoke or burning smell present? Does the GPU fan spin? Specific software error codes..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface font-body-md rounded-lg p-3 border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
                />
              </div>

              {/* Photographic Evidence Attachment */}
              <div>
                <label className="block font-label-md text-secondary uppercase font-bold tracking-wide mb-2">
                  Photographic Evidence / Error Screen (Optional)
                </label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-outline-variant rounded-xl p-4 text-center bg-surface-container-low hover:bg-surface-container transition-colors"
                >
                  {imagePreview ? (
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-48 rounded-lg object-contain border border-outline-variant shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setFormData({ ...formData, imageUrl: '' });
                        }}
                        className="text-error text-body-sm font-semibold hover:underline"
                      >
                        Remove Photograph
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span className="material-symbols-outlined text-[36px] text-secondary">
                        add_photo_alternate
                      </span>
                      <p className="text-body-sm text-secondary">
                        Drag & drop a photo of the defect or error screen, or{' '}
                        <label className="text-primary font-bold hover:underline cursor-pointer">
                          browse file
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleImageFile(e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                      </p>
                      <p className="text-[11px] text-secondary">Supports PNG, JPG, WEBP up to 5MB</p>
                    </div>
                  )}
                  {uploadingImage && (
                    <div className="mt-2 text-primary text-body-sm font-semibold flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span>Uploading to campus secure repository...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                className="btn-tactile-secondary px-5 py-2.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (formData.description.trim().length < 5) {
                    addToast('Please enter an issue description (minimum 5 characters)', 'warning');
                    return;
                  }
                  setActiveStep(3);
                }}
                className="btn-tactile-primary px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 cursor-pointer"
              >
                <span>Review & Submit</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Verification & Submission */}
        {activeStep === 3 && (
          <div className="space-y-space-md animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/30 space-y-space-md shadow-xs">
              <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3">
                <span className="material-symbols-outlined text-primary text-[24px]">verified</span>
                <div>
                  <h3 className="font-headline-md text-on-surface font-bold">3. Review Institutional Submission</h3>
                  <p className="font-body-sm text-secondary">Verify details before dispatching to Lab In-Charge</p>
                </div>
              </div>

              {/* Review Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant/40 text-body-sm">
                <div>
                  <span className="text-secondary font-label-sm uppercase font-bold block">Facility</span>
                  <p className="font-bold text-on-surface mt-0.5">{formData.labName}</p>
                  <p className="text-secondary text-[12px]">{selectedLabObj?.location}</p>
                </div>

                <div>
                  <span className="text-secondary font-label-sm uppercase font-bold block">Equipment / Bench ID</span>
                  <p className="font-bold text-primary font-mono text-body-md mt-0.5">{formData.systemNumber}</p>
                </div>

                <div>
                  <span className="text-secondary font-label-sm uppercase font-bold block">Category & Priority</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-semibold text-on-surface">{formData.issueCategory}</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      formData.priority === 'CRITICAL' ? 'bg-error text-on-error' : 'bg-primary text-on-primary'
                    }`}>
                      {formData.priority}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-secondary font-label-sm uppercase font-bold block">Reporter Identity</span>
                  <p className="font-semibold text-on-surface mt-0.5">{user?.name} ({user?.role})</p>
                  <p className="text-secondary text-[12px] font-mono">Roll: {user?.rollNumber || 'Faculty'}</p>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-outline-variant/30">
                  <span className="text-secondary font-label-sm uppercase font-bold block">Problem Description</span>
                  <p className="text-on-surface mt-1 whitespace-pre-line leading-relaxed">{formData.description}</p>
                </div>

                {formData.imageUrl && (
                  <div className="sm:col-span-2 pt-2 border-t border-outline-variant/30">
                    <span className="text-secondary font-label-sm uppercase font-bold block mb-2">Photographic Attachment</span>
                    <img src={formData.imageUrl} alt="Attached Evidence" className="max-h-36 rounded-lg object-contain border" />
                  </div>
                )}
              </div>

              {/* Workflow Routing Banner */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-body-sm flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-blue-700 shrink-0">route</span>
                <div>
                  <p className="font-bold">Automated 4-Step Technical Workflow:</p>
                  <p className="text-[12px] mt-0.5 leading-relaxed">
                    1. Problem Logged (<code className="bg-blue-100 px-1 rounded">SUBMITTED_TO_LAB_INCHARGE</code>) &rarr;
                    2. Lab In-Charge Hardware Verification &rarr;
                    3. HOD Department Approval &rarr;
                    4. Admin Work Order & Repair Dispatch.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="btn-tactile-secondary px-5 py-2.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="btn-tactile-primary px-8 py-3 rounded-lg font-bold text-body-md flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Dispatching Grievance...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">send</span>
                    <span>Submit Grievance to Lab In-Charge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

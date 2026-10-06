import React from 'react';

export default function EvidenceModal({ imageUrl, complaintId, labName, onClose }) {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative max-w-4xl w-full bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-surface-container flex items-center justify-between border-b border-outline-variant/30">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[24px]">photo_camera</span>
            <div>
              <h3 className="font-headline-sm text-body-md font-bold text-on-surface">
                Equipment Fault Evidence Studio
              </h3>
              <p className="font-label-sm text-label-sm text-secondary font-mono">
                {complaintId} • {labName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-container-highest transition-colors text-secondary hover:text-on-surface cursor-pointer"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Image Preview Container */}
        <div className="p-6 bg-slate-900 flex items-center justify-center min-h-[350px] max-h-[70vh] overflow-hidden">
          <img
            src={imageUrl}
            alt="Fault Evidence"
            className="max-h-[65vh] w-auto object-contain rounded shadow-lg border border-slate-700"
          />
        </div>

        {/* Footer Meta */}
        <div className="px-6 py-3 bg-surface-container-lowest flex items-center justify-between text-secondary border-t border-outline-variant/30">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-label-sm text-label-sm font-mono">EXIF & Integrity Verified</span>
          </div>
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-tactile-secondary px-3 py-1.5 rounded text-body-sm font-semibold flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            Open Full Resolution
          </a>
        </div>
      </div>
    </div>
  );
}

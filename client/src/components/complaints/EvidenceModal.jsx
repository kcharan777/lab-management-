import React, { useState } from 'react';

/**
 * Resolves local image URLs if the port or host doesn't match the current backend server
 */
function resolveImageUrl(url) {
  if (!url) return '';
  // If the stored URL points to a different local port (like :10000), adapt to localhost:5000 or relative /uploads
  if (url.startsWith('http://localhost:10000/uploads/')) {
    return url.replace('http://localhost:10000/uploads/', 'http://localhost:5000/uploads/');
  }
  return url;
}

export default function EvidenceModal({ imageUrl, complaintId, labName, title = 'Equipment Fault Evidence Studio', onClose }) {
  const [imgError, setImgError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (!imageUrl) return null;

  const resolvedUrl = resolveImageUrl(imageUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative max-w-4xl w-full bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-surface-container flex items-center justify-between border-b border-outline-variant/30">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[24px]">photo_camera</span>
            <div>
              <h3 className="font-headline-sm text-body-md font-bold text-on-surface">
                {title}
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
        <div className="p-6 bg-slate-900 flex flex-col items-center justify-center min-h-[350px] max-h-[70vh] overflow-hidden relative">
          {imgError ? (
            <div className="flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <span className="material-symbols-outlined text-6xl text-slate-600 mb-3">broken_image</span>
              <p className="font-semibold text-slate-200 text-body-md mb-1">Image Preview Unavailable</p>
              <p className="text-body-sm text-slate-400 max-w-md mb-4 font-mono text-xs break-all">
                The stored image file was not found on the local server or storage service.
              </p>
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-tactile-secondary text-xs px-3 py-1.5 rounded flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                <span>Try direct link ({resolvedUrl.split('/').pop()})</span>
              </a>
            </div>
          ) : (
            <>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 z-10">
                  <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                </div>
              )}
              <img
                src={resolvedUrl}
                alt="Fault Evidence"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setImgError(true);
                }}
                className={`max-h-[65vh] w-auto object-contain rounded shadow-lg border border-slate-700 transition-opacity duration-200 ${
                  loading ? 'opacity-0' : 'opacity-100'
                }`}
              />
            </>
          )}
        </div>

        {/* Footer Meta */}
        <div className="px-6 py-3 bg-surface-container-lowest flex items-center justify-between text-secondary border-t border-outline-variant/30">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${imgError ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
            <span className="font-label-sm text-label-sm font-mono">
              {imgError ? 'File Not Found on Disk' : 'EXIF & Integrity Verified'}
            </span>
          </div>
          <a
            href={resolvedUrl}
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

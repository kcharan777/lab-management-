const { Complaint } = require('../models/Complaint');

/**
 * Generates an institutional sequential complaint ID.
 * Format: CMP-YYYY-XXXX (e.g. CMP-2026-0001)
 */
async function generateComplaintId() {
  const currentYear = new Date().getFullYear();
  const prefix = `CMP-${currentYear}-`;

  // Find the latest complaint created in the current year
  const latestComplaint = await Complaint.findOne({
    complaintId: { $regex: `^${prefix}` },
  })
    .sort({ createdAt: -1 })
    .select('complaintId')
    .lean();

  let nextSequence = 1;
  if (latestComplaint && latestComplaint.complaintId) {
    const parts = latestComplaint.complaintId.split('-');
    if (parts.length === 3) {
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        nextSequence = lastSeq + 1;
      }
    }
  }

  const paddedSequence = String(nextSequence).padStart(4, '0');
  const candidateId = `${prefix}${paddedSequence}`;

  // Double-check uniqueness
  const exists = await Complaint.exists({ complaintId: candidateId });
  if (exists) {
    // If by chance a collision occurs, generate random suffix
    return `${prefix}${paddedSequence}-${Date.now().toString().slice(-3)}`;
  }

  return candidateId;
}

module.exports = {
  generateComplaintId,
};

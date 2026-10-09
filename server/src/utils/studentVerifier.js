const { StudentRegistry } = require('../models/StudentRegistry');

/**
 * MLRIT Roll Number Format Specification:
 * Standard Format: 10 alphanumeric characters.
 * Example: 24R21A66J9, 21R21A0501, 23R25A0412
 *
 * Pattern breakdown:
 * - [0-9]{2}    : 2-digit Admission Year (e.g., 20-26)
 * - R2          : MLRIT College Code (Autonomous / JNTUH Code)
 * - 1A | 5A | 1E | 1D : Program Code:
 *                  1A = B.Tech Regular
 *                  5A = B.Tech Lateral Entry
 *                  1E = MBA
 *                  1D = M.Tech
 * - [0-9A-Z]{2} : Branch / Specialization Code (e.g. 05 = CSE, 66 = CSM, 67 = CSD, 12 = IT, 04 = ECE, 02 = EEE, 03 = MECH, 01 = CIVIL)
 * - [0-9A-Z]{2} : Student Serial Identifier (01-99, A0-Z9, etc.)
 */
const MLRIT_ROLL_REGEX = /^[0-9]{2}R2(1A|5A|1E|1D)[0-9A-Z]{2}[0-9A-Z]{2}$/i;

/**
 * Validates whether a roll number conforms to official MLRIT structure
 * @param {string} rollNumber - Student institutional roll number
 * @returns {{ isValid: boolean, error?: string, parsed?: object }}
 */
function validateRollNumberFormat(rollNumber) {
  if (!rollNumber || typeof rollNumber !== 'string') {
    return { isValid: false, error: 'Roll number is required as a string.' };
  }

  const normalized = rollNumber.trim().toUpperCase();

  if (normalized.length !== 10) {
    return {
      isValid: false,
      error: `Invalid roll number length (${normalized.length}). MLRIT institutional roll numbers must be exactly 10 alphanumeric characters (e.g., 24R21A66J9).`,
    };
  }

  if (!MLRIT_ROLL_REGEX.test(normalized)) {
    return {
      isValid: false,
      error: `Invalid MLRIT roll number structure (${normalized}). Expected pattern: [YY]R2[Program][Branch][Roll], e.g. 24R21A66J9.`,
    };
  }

  const year = parseInt(normalized.substring(0, 2), 10);
  const collegeCode = normalized.substring(2, 4);
  const programCode = normalized.substring(4, 6);
  const branchCode = normalized.substring(6, 8);
  const serial = normalized.substring(8, 10);

  // Validate admission year (e.g. 2018 to 2026)
  if (year < 18 || year > 26) {
    return {
      isValid: false,
      error: `Invalid admission year '${year}'. Must correspond to an active college batch (2018-2026).`,
    };
  }

  if (collegeCode !== 'R2') {
    return {
      isValid: false,
      error: `Institution code '${collegeCode}' does not match MLRIT (R2).`,
    };
  }

  return {
    isValid: true,
    normalized,
    parsed: { year, collegeCode, programCode, branchCode, serial },
  };
}

/**
 * Verifies if roll number belongs to an eligible student.
 * If StudentRegistry has entries, verifies membership and registration state.
 * @param {string} normalizedRoll - Normalized 10-char roll number
 * @returns {Promise<{ isEligible: boolean, error?: string, registryEntry?: object }>}
 */
async function verifyStudentRegistryEligibility(normalizedRoll) {
  const totalRegistryRecords = await StudentRegistry.countDocuments();

  // If student registry has been populated by college admin
  if (totalRegistryRecords > 0) {
    const entry = await StudentRegistry.findOne({ rollNumber: normalizedRoll });
    if (!entry) {
      return {
        isEligible: false,
        error: `Roll number '${normalizedRoll}' was not found in the authorized college student registry. Please contact administration.`,
      };
    }
    if (entry.isRegistered) {
      return {
        isEligible: false,
        error: `Roll number '${normalizedRoll}' has already been registered with an active user account.`,
      };
    }
    return { isEligible: true, registryEntry: entry };
  }

  // If registry collection has not yet been seeded with bulk data, format verification suffices
  return { isEligible: true, registryEntry: null };
}

module.exports = {
  MLRIT_ROLL_REGEX,
  validateRollNumberFormat,
  verifyStudentRegistryEligibility,
};

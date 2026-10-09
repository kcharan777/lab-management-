const { Department, User } = require('../models');
const ApiResponse = require('../utils/apiResponse');

/**
 * Standard MLRIT Department Baseline Data
 */
const DEFAULT_DEPARTMENTS = [
  {
    name: 'Computer Science & Engineering',
    code: 'CSE',
    description: 'Core computing, systems engineering, algorithms, and software development.',
    programs: [
      { name: 'Bachelor of Technology (B.Tech)', code: '1A' },
      { name: 'Master of Technology (M.Tech)', code: '1D' },
    ],
    specializations: [
      'Core Computer Science',
      'Artificial Intelligence & Machine Learning',
      'Data Science',
      'Cyber Security',
      'Cloud & DevOps',
    ],
  },
  {
    name: 'CSE - Artificial Intelligence & Machine Learning',
    code: 'CSM',
    description: 'Specialized deep learning, neural networks, computer vision, and NLP systems.',
    programs: [
      { name: 'Bachelor of Technology (B.Tech)', code: '1A' },
    ],
    specializations: [
      'Deep Learning & Neural Networks',
      'Natural Language Processing',
      'Computer Vision & Robotics',
      'Autonomous Systems',
    ],
  },
  {
    name: 'CSE - Data Science',
    code: 'CSD',
    description: 'Big data pipelines, statistical modeling, data engineering, and analytics.',
    programs: [
      { name: 'Bachelor of Technology (B.Tech)', code: '1A' },
    ],
    specializations: [
      'Big Data Engineering',
      'Business Intelligence & Analytics',
      'Statistical Learning & Inference',
    ],
  },
  {
    name: 'CSE - Cyber Security',
    code: 'CSC',
    description: 'Network defense, digital forensics, cryptographic security, and ethical hacking.',
    programs: [
      { name: 'Bachelor of Technology (B.Tech)', code: '1A' },
    ],
    specializations: [
      'Network Security & Cryptography',
      'Digital Forensics & Incident Response',
      'Penetration Testing & Red Teaming',
    ],
  },
  {
    name: 'Information Technology',
    code: 'IT',
    description: 'Enterprise architectures, cloud virtualization, and full-stack software systems.',
    programs: [
      { name: 'Bachelor of Technology (B.Tech)', code: '1A' },
    ],
    specializations: [
      'Enterprise Software Architecture',
      'Cloud Virtualization & Distributed Systems',
    ],
  },
  {
    name: 'Electronics & Communication Engineering',
    code: 'ECE',
    description: 'VLSI circuit design, embedded controllers, signal processing, and telecommunication.',
    programs: [
      { name: 'Bachelor of Technology (B.Tech)', code: '1A' },
      { name: 'Master of Technology (M.Tech)', code: '1D' },
    ],
    specializations: [
      'VLSI Design & Embedded Systems',
      'Wireless Communications & RF',
      'Signal & Image Processing',
    ],
  },
  {
    name: 'Electrical & Electronics Engineering',
    code: 'EEE',
    description: 'Power systems, smart grids, renewable energy, and power electronic converters.',
    programs: [
      { name: 'Bachelor of Technology (B.Tech)', code: '1A' },
    ],
    specializations: [
      'Smart Grid & Power Systems',
      'Electric Vehicle Technology & Drives',
      'Renewable Energy Integration',
    ],
  },
  {
    name: 'Mechanical Engineering',
    code: 'MECH',
    description: 'CAD/CAM modeling, thermodynamics, robotics, and precision manufacturing.',
    programs: [
      { name: 'Bachelor of Technology (B.Tech)', code: '1A' },
    ],
    specializations: [
      'Robotics & Industrial Automation',
      'Thermal & Fluid Engineering',
      'Additive Manufacturing (3D Printing)',
    ],
  },
  {
    name: 'Civil Engineering',
    code: 'CIVIL',
    description: 'Structural mechanics, geotechnical surveying, and environmental infrastructure.',
    programs: [
      { name: 'Bachelor of Technology (B.Tech)', code: '1A' },
    ],
    specializations: [
      'Structural Analysis & Design',
      'Geotechnical & Foundation Engineering',
      'GIS & Remote Sensing',
    ],
  },
];

/**
 * Helper to ensure default departments exist on initial boot
 */
const seedDepartmentsIfEmpty = async () => {
  try {
    const count = await Department.countDocuments();
    if (count === 0) {
      await Department.insertMany(DEFAULT_DEPARTMENTS);
      console.log(`[Seed Service] Pre-seeded ${DEFAULT_DEPARTMENTS.length} MLRIT departments.`);
    }
  } catch (err) {
    console.error('[Seed Service Error] Department seeding error:', err.message);
  }
};

/**
 * @route   GET /api/departments
 * @desc    Get all campus departments with specializations and programs
 * @access  Public / Authenticated
 */
const getDepartments = async (req, res, next) => {
  try {
    let departments = await Department.find({ isActive: true })
      .sort({ name: 1 })
      .populate('hod', 'name email phone')
      .lean();

    if (departments.length === 0) {
      await seedDepartmentsIfEmpty();
      departments = await Department.find({ isActive: true }).sort({ name: 1 }).lean();
    }

    return ApiResponse.success(res, departments, 'Departments retrieved successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/departments
 * @desc    Create a new department
 * @access  Private (MAIN_ADMIN)
 */
const createDepartment = async (req, res, next) => {
  try {
    const { name, code, description = '', programs = [], specializations = [] } = req.body;

    if (!name || !code) {
      return ApiResponse.error(res, 'Department name and code are required.', 400);
    }

    const existing = await Department.findOne({
      $or: [{ name: name.trim() }, { code: code.trim().toUpperCase() }],
    });

    if (existing) {
      return ApiResponse.error(
        res,
        `Department with name '${name}' or code '${code}' already exists.`,
        409
      );
    }

    const dept = new Department({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
      programs: Array.isArray(programs) ? programs : [],
      specializations: Array.isArray(specializations) ? specializations : [],
    });

    await dept.save();

    return ApiResponse.success(res, dept, 'Department created successfully.', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/departments/:id
 * @desc    Update an existing department
 * @access  Private (MAIN_ADMIN)
 */
const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, description, programs, specializations, hod, isActive } = req.body;

    const dept = await Department.findById(id);
    if (!dept) {
      return ApiResponse.error(res, 'Department not found.', 404);
    }

    if (name) dept.name = name.trim();
    if (code) dept.code = code.trim().toUpperCase();
    if (description !== undefined) dept.description = description.trim();
    if (Array.isArray(programs)) dept.programs = programs;
    if (Array.isArray(specializations)) dept.specializations = specializations;
    if (hod !== undefined) dept.hod = hod || null;
    if (isActive !== undefined) dept.isActive = isActive;

    await dept.save();

    return ApiResponse.success(res, dept, 'Department updated successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/departments/:id
 * @desc    Deactivate a department
 * @access  Private (MAIN_ADMIN)
 */
const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dept = await Department.findById(id);

    if (!dept) {
      return ApiResponse.error(res, 'Department not found.', 404);
    }

    dept.isActive = false;
    await dept.save();

    return ApiResponse.success(res, null, `Department '${dept.name}' deactivated successfully.`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  seedDepartmentsIfEmpty,
};

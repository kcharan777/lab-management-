const { User, USER_ROLES } = require('./User');
const {
  Complaint,
  COMPLAINT_STATUSES,
  ISSUE_CATEGORIES,
  PRIORITY_LEVELS,
} = require('./Complaint');
const { StatusHistory } = require('./StatusHistory');
const { Notification } = require('./Notification');
const { Department } = require('./Department');
const { Lab, LAB_STATUSES } = require('./Lab');
const { StudentRegistry } = require('./StudentRegistry');

module.exports = {
  User,
  USER_ROLES,
  Complaint,
  COMPLAINT_STATUSES,
  ISSUE_CATEGORIES,
  PRIORITY_LEVELS,
  StatusHistory,
  Notification,
  Department,
  Lab,
  LAB_STATUSES,
  StudentRegistry,
};

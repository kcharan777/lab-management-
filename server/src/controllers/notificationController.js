const { Notification } = require('../models/Notification');
const ApiResponse = require('../utils/apiResponse');

/**
 * @route   GET /api/notifications
 * @desc    Get current user's in-app notification alerts
 * @access  Private
 */
const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .populate('complaintId', 'complaintId labName status priority systemNumber')
      .lean();

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return ApiResponse.success(
      res,
      {
        notifications,
        unreadCount,
        total: notifications.length,
      },
      'User notifications retrieved successfully.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a specific notification as read
 * @access  Private
 */
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      recipient: req.user._id,
    });

    if (!notification) {
      return ApiResponse.error(res, 'Notification not found or access denied.', 404);
    }

    notification.isRead = true;
    await notification.save();

    return ApiResponse.success(
      res,
      notification,
      'Notification marked as read.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all user's notifications as read
 * @access  Private
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    return ApiResponse.success(
      res,
      { modifiedCount: result.modifiedCount },
      'All notifications marked as read.'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};

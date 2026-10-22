const NotificationModel = require('../models/notificationModel');

const NotificationController = {
  async listNotifications(req, res, next) {
    try {
      const data = await NotificationModel.list(req.user.id);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async markAllRead(req, res, next) {
    try {
      await NotificationModel.markAllAsRead(req.user.id);
      res.json({ message: 'All notifications marked as read.' });
    } catch (err) {
      next(err);
    }
  },

  async markRead(req, res, next) {
    try {
      const notificationId = parseInt(req.params.id, 10);
      await NotificationModel.markAsRead(notificationId, req.user.id);
      res.json({ message: 'Marked as read.' });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = NotificationController;

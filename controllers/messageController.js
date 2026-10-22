const MessageModel = require('../models/messageModel');
const UserModel = require('../models/userModel');
const NotificationModel = require('../models/notificationModel');

let ioInstance = null;

function setSocketIO(io) {
  ioInstance = io;
}

const MessageController = {
  setSocketIO,

  async listConversations(req, res, next) {
    try {
      const conversations = await MessageModel.listConversations(req.user.id);
      res.json(conversations);
    } catch (err) {
      next(err);
    }
  },

  async getMessages(req, res, next) {
    try {
      const withUserId = parseInt(req.query.with_user, 10);
      if (!withUserId) {
        return res.status(400).json({ detail: 'with_user parameter is required.' });
      }

      const otherUser = await UserModel.findById(withUserId);
      if (!otherUser) {
        return res.status(404).json({ detail: 'This user does not exist.' });
      }

      const messages = await MessageModel.getMessagesBetween(req.user.id, withUserId);
      res.json({
        user: UserModel.formatSmallUser(otherUser),
        messages
      });
    } catch (err) {
      next(err);
    }
  },

  async sendMessage(req, res, next) {
    try {
      const { receiver_id, message } = req.body;
      const messageText = (message || '').trim();

      if (!messageText) {
        return res.status(400).json({ detail: 'Message cannot be empty.' });
      }

      const receiverId = parseInt(receiver_id, 10);
      const receiver = await UserModel.findById(receiverId);

      if (!receiver) {
        return res.status(404).json({ detail: 'This user does not exist.' });
      }

      if (receiverId === req.user.id) {
        return res.status(400).json({ detail: 'You cannot message yourself.' });
      }

      const newMessage = await MessageModel.sendMessage(req.user.id, receiverId, messageText);

      await NotificationModel.notify(
        receiverId,
        `${req.user.full_name} sent you a message`,
        'message',
        `messages.html?user=${req.user.id}`
      );

      // Emit real-time event to receiver via Socket.IO if available
      if (ioInstance) {
        ioInstance.to(`user_${receiverId}`).emit('new_message', {
          ...newMessage,
          sender: UserModel.formatSmallUser(req.user)
        });
      }

      res.json(newMessage);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = MessageController;

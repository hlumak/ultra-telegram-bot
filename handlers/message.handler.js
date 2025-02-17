const CONSTANTS = require('../configs/constants');
const { formatCustomEmojis } = require('../utils/message.util');

class MessageHandler {
  constructor(dbService) {
    this.dbService = dbService;
    this.groupTagSettings = new Map();
    this.messageTypeHandlers = {
      text: message => ({
        content: formatCustomEmojis(message.text, message.entities),
        type: CONSTANTS.MESSAGE_TYPES.TEXT
      }),
      animation: message => ({
        content: message.animation.file_id,
        type: CONSTANTS.MESSAGE_TYPES.GIF
      }),
      sticker: message => ({
        content: message.sticker.file_id,
        type: CONSTANTS.MESSAGE_TYPES.STICKER
      }),
      video: message => ({
        content: message.video.file_id,
        type: CONSTANTS.MESSAGE_TYPES.VIDEO
      }),
      photo: message => ({
        content: message.photo[message.photo.length - 1].file_id,
        type: CONSTANTS.MESSAGE_TYPES.PHOTO
      }),
      audio: message => ({
        content: message.audio.file_id,
        type: CONSTANTS.MESSAGE_TYPES.AUDIO
      }),
      voice: message => ({
        content: message.voice.file_id,
        type: CONSTANTS.MESSAGE_TYPES.VOICE
      }),
      video_note: message => ({
        content: message.video_note.file_id,
        type: CONSTANTS.MESSAGE_TYPES.VIDEO_NOTE
      }),
      document: message => ({
        content: message.document.file_id,
        type: CONSTANTS.MESSAGE_TYPES.DOCUMENT
      })
    };
  }

  async handlePrivateMessage(ctx) {
    if (ctx.chat.type !== 'private') return;

    const userId = ctx.from.id;
    if (!this.groupTagSettings.has(userId)) {
      return ctx.reply('Немає активного запиту на оновлення повідомлення.');
    }

    const groupId = this.groupTagSettings.get(userId);
    this.groupTagSettings.delete(userId);

    return this.processTagMessage(ctx, ctx.message, groupId);
  }

  async handleSetTagMsg(ctx) {
    const { id: userId } = ctx.from;
    const { type: chatType, id: chatId } = ctx.chat;
    const { reply_to_message: replyToMessage } = ctx.message;

    if (!CONSTANTS.VALID_CHAT_TYPES.includes(chatType)) {
      return ctx.reply('Цю команду можна використовувати тільки в групі!');
    }

    if (replyToMessage) {
      return this.processTagMessage(ctx, replyToMessage);
    }

    try {
      this.groupTagSettings.set(userId, chatId);
      return ctx.api.sendMessage(
        userId,
        'Напишіть повідомлення, скиньте стікер, гіфку, відео, фото, аудіо або голосове повідомлення для тегування в групі.'
      );
    } catch (error) {
      return this.handleSetTagMsgError(ctx, error);
    }
  }

  async processTagMessage(ctx, message, groupId = ctx.chat.id) {
    try {
      const messageType = this.getMessageType(message);
      if (!messageType) {
        return ctx.reply(
          'Надішліть текст, стікер, гіфку, відео, фото, аудіо, документ або голосове повідомлення.'
        );
      }

      const handler = this.messageTypeHandlers[messageType];
      const { content, type } = handler(message);

      await this.dbService.updateTagMessage(groupId, content, type);
      return ctx.reply('Повідомлення для тегування оновлено.');
    } catch (error) {
      console.error('Error updating tag message:', error);
      return ctx.reply('Помилка при оновленні повідомлення.');
    }
  }

  getMessageType(message) {
    return Object.keys(this.messageTypeHandlers).find(type => {
      if (type === 'photo') {
        return message[type] && message[type].length;
      }
      return message[type];
    });
  }

  async handleSetTagMsgError(ctx, error) {
    if (error.description?.includes("can't initiate conversation with a user")) {
      return ctx.reply(
        'Будь ласка, почніть діалог з ботом, надіславши команду /start у особисті повідомлення.'
      );
    }
    console.error('Error sending message to private chat:', error);
    return ctx.reply('Сталася помилка. Спробуйте пізніше.');
  }
}

module.exports = MessageHandler;

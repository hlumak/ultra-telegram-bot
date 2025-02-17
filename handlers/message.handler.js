const CONSTANTS = require('../configs/constants');
const { formatCustomEmojis } = require('../utils/message.util');

class MessageHandler {
  constructor(dbService) {
    this.dbService = dbService;
    this.groupTagSettings = new Map();
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
        'Напишіть повідомлення, скиньте гіфку або стікер для тегування в групі.'
      );
    } catch (error) {
      return this.handleSetTagMsgError(ctx, error);
    }
  }

  async processTagMessage(ctx, message, groupId = ctx.chat.id) {
    const { text, animation, sticker, entities } = message;

    try {
      if (text) {
        const formattedText = formatCustomEmojis(text, entities);
        await this.dbService.updateTagMessage(groupId, formattedText, 'text');
      } else if (animation) {
        await this.dbService.updateTagMessage(groupId, animation.file_id, 'gif');
      } else if (sticker) {
        await this.dbService.updateTagMessage(groupId, sticker.file_id, 'sticker');
      } else {
        return ctx.reply('Надішліть текст, стікер або гіфку.');
      }

      return ctx.reply('Повідомлення для тегування оновлено.');
    } catch (error) {
      console.error('Error updating tag message:', error);
      return ctx.reply('Помилка при оновленні повідомлення.');
    }
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

const CONSTANTS = require('../configs/constants');
const { splitMentionsIntoChunks } = require('../utils/message.util');

class CommandsHandler {
  constructor(telegramService, dbService) {
    this.telegramService = telegramService;
    this.dbService = dbService;
  }

  async handleAbout(ctx) {
    return ctx.reply('Це бот для тегування усіх учасників группи. Автор: @v_hlumak');
  }

  async handleTagAll(ctx) {
    const { id: chatId, type } = ctx.chat;

    if (!CONSTANTS.VALID_CHAT_TYPES.includes(type)) {
      return ctx.reply('Цю команду можна використовувати тільки в групі!');
    }

    const isTagCommand = ctx.message.text.match(/^\/tag_all(@| |$)/);
    if (isTagCommand) {
      await this.sendTagMessage(ctx, chatId);
    }

    return this.tagAllMembers(ctx, chatId);
  }

  async sendTagMessage(ctx, chatId) {
    const groupCommand = await this.dbService.getGroupCommand(chatId);
    if (!groupCommand?.message) {
      await this.dbService.updateTagMessage(chatId, 'Тегаю всіх', 'text');
      return ctx.reply('Тегаю всіх');
    }

    const { message, type } = groupCommand;
    const messageHandlers = {
      sticker: () => ctx.replyWithSticker(message),
      gif: () => ctx.replyWithAnimation(message),
      text: () => ctx.reply(message, { parse_mode: 'HTML' })
    };

    return messageHandlers[type]?.() || messageHandlers.text();
  }

  async tagAllMembers(ctx, chatId) {
    const users = await this.telegramService.getAllMembers(chatId);
    if (!users.length) {
      return ctx.reply('Не вдалося отримати список учасників.');
    }

    const mentionChunks = splitMentionsIntoChunks(users);
    return Promise.all(mentionChunks.map(chunk => ctx.reply(chunk, { parse_mode: 'HTML' })));
  }
}

module.exports = CommandsHandler;

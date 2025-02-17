const CONSTANTS = require('../configs/constants');
const { splitMentionsIntoChunks } = require('../utils/message.util');

class CommandsHandler {
  constructor(telegramService, dbService) {
    this.telegramService = telegramService;
    this.dbService = dbService;
  }

  async handleAbout(ctx) {
    return ctx.reply(
      'Це бот для тегування усіх учасників группи.\n' +
        'Автор: @v_hlumak <a href="https://github.com/hlumak938/ultra-telegram-bot">Github</a>',
      { parse_mode: 'HTML' }
    );
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
      await this.dbService.updateTagMessage(chatId, 'Тегаю всіх', CONSTANTS.MESSAGE_TYPES.TEXT);
      return ctx.reply('Тегаю всіх');
    }

    const { message, type } = groupCommand;
    const messageHandlers = {
      [CONSTANTS.MESSAGE_TYPES.STICKER]: () => ctx.replyWithSticker(message),
      [CONSTANTS.MESSAGE_TYPES.GIF]: () => ctx.replyWithAnimation(message),
      [CONSTANTS.MESSAGE_TYPES.VIDEO]: () => ctx.replyWithVideo(message),
      [CONSTANTS.MESSAGE_TYPES.PHOTO]: () => ctx.replyWithPhoto(message),
      [CONSTANTS.MESSAGE_TYPES.AUDIO]: () => ctx.replyWithAudio(message),
      [CONSTANTS.MESSAGE_TYPES.VOICE]: () => ctx.replyWithVoice(message),
      [CONSTANTS.MESSAGE_TYPES.VIDEO_NOTE]: () => ctx.replyWithVideoNote(message),
      [CONSTANTS.MESSAGE_TYPES.DOCUMENT]: () => ctx.replyWithDocument(message),
      [CONSTANTS.MESSAGE_TYPES.TEXT]: () => ctx.reply(message, { parse_mode: 'HTML' })
    };

    return messageHandlers[type]?.() || messageHandlers[CONSTANTS.MESSAGE_TYPES.TEXT]();
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

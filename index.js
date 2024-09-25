const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const {Api, TelegramClient} = require('telegram');
const {StringSession} = require('telegram/sessions');

dotenv.config();

if (!process.env.BOT_TOKEN || !process.env.API_ID || !process.env.API_HASH) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const bot = new TelegramBot(process.env.BOT_TOKEN, {polling: true});

const client = new TelegramClient(
  new StringSession(''),
  +process.env.API_ID,
  process.env.API_HASH,
  {connectionRetries: 5}
);

const tagCommands = [];

const startGramJS = async () => {
  try {
    await client.start({
      botAuthToken: process.env.BOT_TOKEN
    });
    console.log('GramJS client started');
    client.session.save();
  } catch (error) {
    console.error('Error starting GramJS client:', error);
  }
};

const getAllMembers = async (groupId) => {
  let usersToMention = [];
  let offset = 0;
  const limit = 100;

  try {
    let participants;

    do {
      participants = await client.invoke(
        new Api.channels.GetParticipants({
          channel: groupId,
          filter: new Api.ChannelParticipantsRecent({}),
          offset,
          limit,
          hash: BigInt(0)
        })
      );

      const userBatch = participants.users.filter(user => !user.bot);
      usersToMention = usersToMention.concat(userBatch);

      offset += limit;
    } while (participants.participants.length > 0);

    return usersToMention;
  } catch (error) {
    console.error('Error fetching members:', error);
    return [];
  }
};

bot.onText(/\/tag_all/, async (msg) => {
  const chatId = msg.chat.id;

  if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
    const groupCommand = tagCommands.find(command => command.group === chatId);
    if (groupCommand && groupCommand.message) {
      if (groupCommand.type === 'sticker') {
        await bot.sendSticker(chatId, groupCommand.message);
      } else if (groupCommand.type === 'gif') {
        await bot.sendAnimation(chatId, groupCommand.message);
      } else {
        await bot.sendMessage(chatId, groupCommand.message);
      }
    } else {
      tagCommands.push({group: chatId, message: 'Тегаю всіх', type: 'text'});
      await bot.sendMessage(chatId, 'Тегаю всіх');
    }

    const users = await getAllMembers(chatId);

    const mentionChunks = [];
    const MAX_MESSAGE_LENGTH = 4096;
    let currentChunk = [];

    for (const user of users) {
      const mention = user.username ? `@${user.username} ` : `<a href="tg://user?id=${user.id}">${user.firstName}</a> `;
      currentChunk.push(mention);

      if (currentChunk.join('').length > MAX_MESSAGE_LENGTH) {
        mentionChunks.push(currentChunk.join('').trim());
        currentChunk = [mention];
      }
    }
    if (currentChunk.length > 0) {
      mentionChunks.push(currentChunk.join('').trim());
    }

    for (const chunk of mentionChunks) {
      await bot.sendMessage(chatId, chunk, {parse_mode: 'HTML'});
    }
  } else {
    await bot.sendMessage(chatId, 'Цю команду можна використовувати тільки в группі!');
  }
});

const updateTagMessage = (groupId, message, type) => {
  const commandIndex = tagCommands.findIndex(command => command.group === groupId);
  if (commandIndex !== -1) {
    tagCommands[commandIndex].message = message;
    tagCommands[commandIndex].type = type;
  } else {
    tagCommands.push({group: groupId, message, type});
  }
};

bot.onText(/\/set_tag_message/, (msg) => {
  const chatId = msg.chat.id;

  if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
    bot.sendMessage(chatId, 'Напиши повідомлення, скинь гіфку aбо стікер:');

    const handleMessage = async (message, type) => {
      const content = (type === 'text') ? message.text :
        (type === 'gif') ? message.animation.file_id :
          (type === 'sticker') ? message.sticker.file_id : null;

      if (content) {
        updateTagMessage(chatId, content, type);
        bot.sendMessage(chatId, `${type === 'text' ? 'Повідомлення' : type === 'gif' ? 'Гіфка' : 'Стікер'} для тегування оновлено.`);
      }
    };

    bot.once('message', (message) => {
      if (message.text) handleMessage(message, 'text');
      else if (message.animation) handleMessage(message, 'gif');
      else if (message.sticker) handleMessage(message, 'sticker');
    });
  } else {
    bot.sendMessage(chatId, 'Цю команду можна використовувати тільки в групі!');
  }
});

bot.onText(/\/about/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Це бот для тегування усіх учасників группи. Автор: @v_hlumak');
});

(async () => {
  await startGramJS();
})();

process.once('SIGINT', () => bot.stopPolling());
process.once('SIGTERM', () => bot.stopPolling());
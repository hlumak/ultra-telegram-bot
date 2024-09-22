const {Api, TelegramClient} = require('telegram');
const {StringSession} = require('telegram/sessions');
const {Telegraf} = require('telegraf');
const dotenv = require('dotenv');

dotenv.config();

if (!process.env.BOT_TOKEN || !process.env.API_ID || !process.env.API_HASH) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const client = new TelegramClient(
  new StringSession(''),
  +process.env.API_ID,
  process.env.API_HASH,
  {connectionRetries: 5}
);
const bot = new Telegraf(process.env.BOT_TOKEN);

const startGramJS = async () => {
  try {
    await client.start({
      botAuthToken: process.env.BOT_TOKEN
    });
    console.log('GramJS client started');
    console.log(client.session.save());
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

bot.command('tag_all', async (ctx) => {
  const chatId = ctx.message.chat.id;

  if (ctx.message.chat.type === 'group' || ctx.message.chat.type === 'supergroup') {
    await ctx.replyWithAnimation(process.env.GIF_ID);
    const users = await getAllMembers(chatId);

    const mentionChunks = [];
    const maxMessageLength = 4096;
    let currentChunk = [];

    for (const user of users) {
      const mention = user.username ? `@${user.username} ` : `<a href="tg://user?id=${user.id}">${user.firstName}</a> `;
      currentChunk.push(mention);

      if (currentChunk.join('').length > maxMessageLength) {
        mentionChunks.push(currentChunk.join('').trim());
        currentChunk = [mention];
      }
    }
    if (currentChunk.length > 0) {
      mentionChunks.push(currentChunk.join('').trim());
    }

    for (const chunk of mentionChunks) {
      await ctx.replyWithHTML(chunk);
    }
  } else {
    await ctx.reply('Цю команду можна використовувати тільки в группі!.');
  }
});

(async () => {
  await startGramJS();
  await bot.launch();
  console.log('Bot launched');
})();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
const {Api, TelegramClient} = require('telegram');
const {StringSession} = require('telegram/sessions');
const {Telegraf} = require('telegraf');

const client = new TelegramClient(
  new StringSession(''),
  +process.env.API_ID,
  process.env.API_HASH,
  {connectionRetries: 5}
);
const bot = new Telegraf(process.env.BOT_TOKEN);

const startGramJS = async () => {
  await client.start({
    botAuthToken: process.env.BOT_TOKEN
  });
  console.log(client.session.save());
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
  }
};

bot.command('tag_all', async (ctx) => {
  const chatId = ctx.message.chat.id;

  if (ctx.message.chat.type === 'group' || ctx.message.chat.type === 'supergroup') {
    await ctx.replyWithAnimation(process.env.GIF_ID);
    const users = await getAllMembers(chatId);

    let mentionText = '';
    const maxMessageLength = 4096;

    let messageChunks = [];
    for (const user of users) {
      const mention = user.username ? `@${user.username} ` : `<a href="tg://user?id=${user.id}">${user.firstName}</a> `;

      if ((mentionText + mention).length > maxMessageLength) {
        messageChunks.push(mentionText.trim());
        mentionText = mention;
      } else {
        mentionText += mention;
      }
    }
    messageChunks.push(mentionText.trimEnd());

    for (const chunk of messageChunks) {
      await ctx.replyWithHTML(chunk);
    }
  } else {
    await ctx.reply('Цю команду можна використовувати тільки в группі!.');
  }
});

(async () => {
  await startGramJS();
  await bot.launch();
})();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
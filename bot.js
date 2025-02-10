import {Bot, Composer} from 'grammy';
import {Api, TelegramClient} from 'telegram';
import {StringSession} from 'telegram/sessions/index.js';
import dotenv from 'dotenv';
import {db} from './firebaseConfig.js';
import {collection, doc, getDocs, query, setDoc, where} from 'firebase/firestore';

dotenv.config();

const REQUIRED_ENV_VARS = ['BOT_TOKEN', 'API_ID', 'API_HASH'];
const missingEnvVars = REQUIRED_ENV_VARS.filter((envVar) => !process.env[envVar]);
if (missingEnvVars.length) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

const bot = new Bot(process.env.BOT_TOKEN);

const client = new TelegramClient(
  new StringSession(''),
  +process.env.API_ID,
  process.env.API_HASH,
  {connectionRetries: 5}
);

const startGramJS = async () => {
  try {
    await client.start({
      botAuthToken: process.env.BOT_TOKEN
    });
    client.session.save();
  } catch (error) {
    console.error('Error starting GramJS client:', error);
  }
};

const getAllMembers = async (groupId) => {
  const LIMIT = 100;
  let offset = 0;
  const usersToMention = [];

  try {
    let participants;
    do {
      participants = await client.invoke(
        new Api.channels.GetParticipants({
          channel: groupId,
          filter: new Api.ChannelParticipantsRecent({}),
          offset,
          LIMIT,
          hash: BigInt(0)
        })
      );

      usersToMention.push(
        ...participants.users.filter((user) => !user.bot)
      );
      offset += LIMIT;
    } while (participants.participants.length > 0);

    return usersToMention;
  } catch (error) {
    console.error('Error fetching members:', error);
    return [];
  }
};

const getGroupCommand = async (groupId) => {
  try {
    const groupRef = collection(db, 'groups');
    const q = query(groupRef, where('groupId', '==', groupId));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty ? querySnapshot.docs[0].data() : null;
  } catch (error) {
    console.error('Error fetching group command:', error);
    return null;
  }
};

const updateTagMessage = async (groupId, message, type) => {
  try {
    await setDoc(
      doc(db, 'groups', groupId.toString()),
      {groupId, message, type},
      {merge: true}
    );
  } catch (error) {
    console.error('Error updating tag message:', error);
  }
};

const splitMentionsIntoChunks = (users) => {
  const MAX_MESSAGE_LENGTH = 4096;
  const mentionChunks = [];
  let currentChunk = '';

  for (const user of users) {
    const mention = user.username
      ? `@${user.username} `
      : `<a href="tg://user?id=${user.id}">${user.firstName}</a> `;
    if (currentChunk.length + mention.length > MAX_MESSAGE_LENGTH) {
      mentionChunks.push(currentChunk);
      currentChunk = mention;
    } else {
      currentChunk += mention;
    }
  }
  if (currentChunk) mentionChunks.push(currentChunk);

  return mentionChunks;
};

bot.command('about', async (ctx) => {
  await ctx.reply('Це бот для тегування усіх учасників группи. Автор: @v_hlumak');
});

bot.command(['tag_all', 'tag_all_without_msg'], async (ctx) => {
  const chatId = ctx.chat.id;
  if (!['group', 'supergroup'].includes(ctx.chat.type)) {
    return ctx.reply('Цю команду можна використовувати тільки в групі!');
  }

  if (ctx.message.text.match(/^\/tag_all(@| |$)/)) {
    const groupCommand = await getGroupCommand(chatId);

    if (groupCommand?.message) {
      const {message, type} = groupCommand;
      if (type === 'sticker') await ctx.replyWithSticker(message);
      else if (type === 'gif') await ctx.replyWithAnimation(message);
      else await ctx.reply(message, {parse_mode: 'HTML'});
    } else {
      await updateTagMessage(chatId, 'Тегаю всіх', 'text');
      await ctx.reply('Тегаю всіх');
    }
  }

  const users = await getAllMembers(chatId);
  if (users.length === 0) return ctx.reply('Не вдалося отримати список учасників.');

  const mentionChunks = splitMentionsIntoChunks(users);
  for (const chunk of mentionChunks) {
    await ctx.reply(chunk, {parse_mode: 'HTML'});
  }
});

const processTagMessage = async (ctx, message, groupId = ctx.chat.id) => {
  const {text, animation, sticker, entities} = message;

  try {
    if (text) {
      let formattedText = text;

      if (entities) {
        for (const entity of entities) {
          if (entity.type === 'custom_emoji' && entity.custom_emoji_id) {
            const emojiChar = text.slice(entity.offset, entity.offset + entity.length);
            const emojiTag = `<tg-emoji emoji-id="${entity.custom_emoji_id}">${emojiChar}</tg-emoji>`;
            formattedText = formattedText.slice(0, entity.offset) +
              emojiTag +
              formattedText.slice(entity.offset + entity.length);
          }
        }
      }

      await updateTagMessage(groupId, formattedText, 'text');
    } else if (animation) {
      await updateTagMessage(groupId, animation.file_id, 'gif');
    } else if (sticker) {
      await updateTagMessage(groupId, sticker.file_id, 'sticker');
    } else {
      return ctx.reply('Надішліть текст, стікер або гіфку.');
    }

    await ctx.reply('Повідомлення для тегування оновлено.');
  } catch (error) {
    console.error('Error updating tag message:', error);
    await ctx.reply('Помилка при оновленні повідомлення.');
  }
};

const groupTagSettings = new Map();

bot.command('set_tag_message', async (ctx) => {
  const userId = ctx.from.id;
  const replyToMessage = ctx.message.reply_to_message;

  if (!['group', 'supergroup'].includes(ctx.chat.type)) {
    return ctx.reply('Цю команду можна використовувати тільки в групі!');
  }

  if (replyToMessage) {
    return processTagMessage(ctx, replyToMessage);
  }

  try {
    groupTagSettings.set(userId, ctx.chat.id);
    await bot.api.sendMessage(
      userId,
      'Напишіть повідомлення, скиньте гіфку або стікер для тегування в групі.'
    );

    await ctx.reply('Перевірте свої особисті повідомлення для подальших інструкцій.');
  } catch (error) {
    if (error.description?.includes('can\'t initiate conversation with a user')) {
      await ctx.reply(
        'Будь ласка, почніть діалог з ботом, надіславши команду /start у особисті повідомлення.'
      );
    } else {
      console.error('Error sending message to private chat:', error);
      await ctx.reply('Сталася помилка. Спробуйте пізніше.');
    }
  }
});

const composer = new Composer();

composer.on('message', async (ctx) => {
  if (ctx.chat.type !== 'private') return;

  const userId = ctx.from.id;
  if (!groupTagSettings.has(userId)) {
    return ctx.reply('Немає активного запиту на оновлення повідомлення.');
  }

  const groupId = groupTagSettings.get(userId);
  groupTagSettings.delete(userId);

  await processTagMessage(ctx, ctx.message, groupId);
});

bot.use(composer.middleware());
(async () => {
  await startGramJS();

  await bot.api.setMyCommands([
    {command: 'tag_all', description: 'Tag all group members'},
    {command: 'tag_all_without_msg', description: 'Tag all members without a message'},
    {command: 'set_tag_message', description: 'Update the tagging message'},
    {command: 'about', description: 'About bot and author'}
  ]);

  await bot.start();
})();

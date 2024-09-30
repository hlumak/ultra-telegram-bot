const TelegramBot = require('node-telegram-bot-api');
const dotenv = require('dotenv');
const {Api, TelegramClient} = require('telegram');
const {StringSession} = require('telegram/sessions');
const {db} = require('./firebaseConfig');
const {collection, getDocs, query, where, setDoc, doc} = require('firebase/firestore');

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

const getGroupCommand = async (groupId) => {
  const groupRef = collection(db, 'groups');
  const q = query(groupRef, where('groupId', '==', groupId));

  try {
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty ? querySnapshot.docs[0].data() : null;
  } catch (error) {
    console.error('Error fetching group command:', error);
  }
};

bot.onText(/\/tag_all/, async (msg) => {
  const chatId = msg.chat.id;

  if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
    const groupCommand = await getGroupCommand(chatId);

    if (groupCommand && groupCommand.message) {
      if (groupCommand.type === 'sticker') {
        await bot.sendSticker(chatId, groupCommand.message);
      } else if (groupCommand.type === 'gif') {
        await bot.sendAnimation(chatId, groupCommand.message);
      } else {
        await bot.sendMessage(chatId, groupCommand.message);
      }
    } else {
      await updateTagMessage(chatId, 'Тегаю всіх', 'text');
      await bot.sendMessage(chatId, 'Тегаю всіх');
    }

    let users = await getAllMembers(chatId);

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
    await bot.sendMessage(chatId, 'Цю команду можна використовувати тільки в групі!');
  }
});

const updateTagMessage = async (groupId, message, type) => {
  try {
    await setDoc(doc(db, 'groups', groupId.toString()), {
      groupId,
      message,
      type
    }, {merge: true});
    console.log(`Group ${groupId} updated with new message and type.`);
  } catch (error) {
    console.error('Error updating tag message:', error);
  }
};

bot.onText(/\/set_tag_message/, async (msg) => {
  const chatId = msg.chat.id;

  if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
    await bot.sendMessage(chatId, 'Напиши повідомлення, скинь гіфку або стікер:');

    const handleMessage = async (message, type) => {
      const content = (type === 'text') ? message.text :
        (type === 'gif') ? message.animation.file_id :
          (type === 'sticker') ? message.sticker.file_id : null;

      if (content) {
        await updateTagMessage(chatId, content, type);
        await bot.sendMessage(chatId, `${type === 'text' ? 'Повідомлення' : type === 'gif' ? 'Гіфка' : 'Стікер'} для тегування оновлено.`);
      }
    };

    bot.once('message', async (message) => {
      if (message.text) await handleMessage(message, 'text');
      else if (message.animation) await handleMessage(message, 'gif');
      else if (message.sticker) await handleMessage(message, 'sticker');
    });
  } else {
    await bot.sendMessage(chatId, 'Цю команду можна використовувати тільки в групі!');
  }
});

bot.onText(/\/about/, async (msg) => {
  await bot.sendMessage(msg.chat.id, 'Це бот для тегування усіх учасників группи. Автор: @v_hlumak');
});

(async () => {
  await startGramJS();
})();

process.once('SIGINT', () => bot.stopPolling());
process.once('SIGTERM', () => bot.stopPolling());
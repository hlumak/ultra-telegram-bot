import { Bot, Composer } from "grammy";
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import dotenv from "dotenv";
import { db } from "./firebaseConfig.js";
import { collection, getDocs, query, where, setDoc, doc } from "firebase/firestore";

dotenv.config();

if (!process.env.BOT_TOKEN || !process.env.API_ID || !process.env.API_HASH) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const bot = new Bot(process.env.BOT_TOKEN);

const client = new TelegramClient(
  new StringSession(""),
  +process.env.API_ID,
  process.env.API_HASH,
  { connectionRetries: 5 }
);

const startGramJS = async () => {
  try {
    await client.start({
      botAuthToken: process.env.BOT_TOKEN,
    });
    console.log("GramJS client started");
    client.session.save();
  } catch (error) {
    console.error("Error starting GramJS client:", error);
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
          hash: BigInt(0),
        })
      );

      const userBatch = participants.users.filter((user) => !user.bot);
      usersToMention = usersToMention.concat(userBatch);

      offset += limit;
    } while (participants.participants.length > 0);

    return usersToMention;
  } catch (error) {
    console.error("Error fetching members:", error);
    return [];
  }
};

const getGroupCommand = async (groupId) => {
  const groupRef = collection(db, "groups");
  const q = query(groupRef, where("groupId", "==", groupId));

  try {
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty ? querySnapshot.docs[0].data() : null;
  } catch (error) {
    console.error("Error fetching group command:", error);
  }
};

const updateTagMessage = async (groupId, message, type) => {
  try {
    await setDoc(
      doc(db, "groups", groupId.toString()),
      {
        groupId,
        message,
        type,
      },
      { merge: true }
    );
    console.log(`Group ${groupId} updated with new message and type.`);
  } catch (error) {
    console.error("Error updating tag message:", error);
  }
};

const splitMentionsIntoChunks = (users) => {
  const mentionChunks = [];
  const MAX_MESSAGE_LENGTH = 4096;
  let currentChunk = [];

  for (const user of users) {
    const mention = user.username
      ? `@${user.username} `
      : `<a href="tg://user?id=${user.id}">${user.firstName}</a> `;
    currentChunk.push(mention);

    if (currentChunk.join("").length > MAX_MESSAGE_LENGTH) {
      mentionChunks.push(currentChunk.join(""));
      currentChunk = [mention];
    }
  }
  if (currentChunk.length > 0) {
    mentionChunks.push(currentChunk.join(""));
  }

  return mentionChunks;
};

bot.command("about", async (ctx) => {
  await ctx.reply("Це бот для тегування усіх учасників группи. Автор: @v_hlumak");
});

bot.command("tag_all_silent", async (ctx) => {
  const chatId = ctx.chat.id;

  if (ctx.chat.type === "group" || ctx.chat.type === "supergroup") {
    let users = await getAllMembers(chatId);

    if (users.length === 0) {
      await ctx.reply("Не вдалося отримати список учасників.");
      return;
    }

    const mentionChunks = splitMentionsIntoChunks(users);
    for (const chunk of mentionChunks) {
      await ctx.reply(chunk, { parse_mode: "HTML" });
    }
  } else {
    await ctx.reply("Цю команду можна використовувати тільки в групі!");
  }
});

bot.command("tag_all", async (ctx) => {
  const chatId = ctx.chat.id;

  if (ctx.chat.type === "group" || ctx.chat.type === "supergroup") {
    const groupCommand = await getGroupCommand(chatId);

    if (groupCommand && groupCommand.message) {
      if (groupCommand.type === "sticker") {
        await ctx.replyWithSticker(groupCommand.message);
      } else if (groupCommand.type === "gif") {
        await ctx.replyWithAnimation(groupCommand.message);
      } else {
        await ctx.reply(groupCommand.message);
      }
    } else {
      await updateTagMessage(chatId, "Тегаю всіх", "text");
      await ctx.reply("Тегаю всіх");
    }

    let users = await getAllMembers(chatId);

    const mentionChunks = splitMentionsIntoChunks(users);
    for (const chunk of mentionChunks) {
      await ctx.reply(chunk, { parse_mode: "HTML" });
    }
  } else {
    await ctx.reply("Цю команду можна використовувати тільки в групі!");
  }
});

const composer = new Composer();
const groupTagSettings = new Map();

bot.command("set_tag_message", async (ctx) => {
  const userId = ctx.from.id;
  const chatId = ctx.chat.id;

  if (ctx.chat.type === "group" || ctx.chat.type === "supergroup") {
    groupTagSettings.set(userId, chatId);
    await ctx.reply("Перевірте свої особисті повідомлення для подальших інструкцій.");
    await bot.api.sendMessage(
      userId,
      "Напишіть повідомлення, скиньте гіфку або стікер для тегування в групі."
    );
  } else {
    await ctx.reply("Цю команду можна використовувати тільки в групі!");
  }
});

composer.on("message", async (ctx) => {
  const userId = ctx.from.id;

  if (!groupTagSettings.has(userId)) {
    return;
  }

  const groupId = groupTagSettings.get(userId);
  const message = ctx.message;

  if (message.text) {
    await updateTagMessage(groupId, message.text, "text");
    await ctx.reply("Повідомлення для тегування оновлено.");
  } else if (message.animation) {
    await updateTagMessage(groupId, message.animation.file_id, "gif");
    await ctx.reply("Гіфка для тегування оновлена.");
  } else if (message.sticker) {
    await updateTagMessage(groupId, message.sticker.file_id, "sticker");
    await ctx.reply("Стікер для тегування оновлено.");
  }

  groupTagSettings.delete(userId);
});

bot.use(composer.middleware());

(async () => {
  await startGramJS();

  await bot.api.setMyCommands([
    { command: "tag_all", description: "Тегнути всіх учасників групи" },
    { command: "tag_all_silent", description: "Тегнути всіх учасників без повідомлення" },
    { command: "set_tag_message", description: "Оновити повідомлення для тегування" },
    { command: "about", description: "Інформація про бота" },
  ]);

  await bot.start();
})();
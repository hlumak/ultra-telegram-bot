const CONSTANTS = require('../configs/constants');

const splitMentionsIntoChunks = users => {
  const mentionChunks = [];
  let currentChunk = '';

  const createMention = user =>
    user.username
      ? `@${user.username} `
      : `<a href="tg://user?id=${user.id}">${user.firstName}</a> `;

  for (const user of users) {
    const mention = createMention(user);
    if (currentChunk.length + mention.length > CONSTANTS.MAX_MESSAGE_LENGTH) {
      mentionChunks.push(currentChunk);
      currentChunk = mention;
    } else {
      currentChunk += mention;
    }
  }

  if (currentChunk) mentionChunks.push(currentChunk);
  return mentionChunks;
};

const formatCustomEmojis = (text, entities) => {
  if (!entities) return text;

  let formattedText = text;
  const sortedEntities = [...entities].sort((a, b) => b.offset - a.offset);

  for (const { type, custom_emoji_id, offset, length } of sortedEntities) {
    if (type === 'custom_emoji' && custom_emoji_id) {
      const emojiChar = text.slice(offset, offset + length);
      const emojiTag = `<tg-emoji emoji-id="${custom_emoji_id}">${emojiChar}</tg-emoji>`;
      formattedText =
        formattedText.slice(0, offset) + emojiTag + formattedText.slice(offset + length);
    }
  }
  return formattedText;
};

module.exports = {
  splitMentionsIntoChunks,
  formatCustomEmojis
};

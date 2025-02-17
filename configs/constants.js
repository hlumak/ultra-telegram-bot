const CONSTANTS = {
  MAX_MESSAGE_LENGTH: 4096,
  FETCH_LIMIT: 100,
  VALID_CHAT_TYPES: ['group', 'supergroup'],
  REQUIRED_TELEGRAM_ENV_VARS: ['BOT_TOKEN', 'API_ID', 'API_HASH'],
  REQUIRED_FIREBASE_ENV_VARS: [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
    'FIREBASE_MEASUREMENT_ID'
  ],
  MESSAGE_TYPES: {
    TEXT: 'text',
    STICKER: 'sticker',
    GIF: 'gif',
    VIDEO: 'video',
    PHOTO: 'photo',
    AUDIO: 'audio',
    VOICE: 'voice',
    VIDEO_NOTE: 'videoNote',
    DOCUMENT: 'document'
  },
  BOT_COMMANDS: [
    { command: 'tag_all', description: 'Tag all group members' },
    { command: 'tag_all_without_msg', description: 'Tag all members without a message' },
    { command: 'set_tag_msg', description: 'Update the tagging message' },
    { command: 'about', description: 'About bot and author' }
  ]
};

module.exports = CONSTANTS;

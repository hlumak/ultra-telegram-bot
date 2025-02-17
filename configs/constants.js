const CONSTANTS = {
  MAX_MESSAGE_LENGTH: 4096,
  FETCH_LIMIT: 100,
  VALID_CHAT_TYPES: ['group', 'supergroup'],
  REQUIRED_ENV_VARS: ['BOT_TOKEN', 'API_ID', 'API_HASH'],
  BOT_COMMANDS: [
    { command: 'tag_all', description: 'Tag all group members' },
    { command: 'tag_all_without_msg', description: 'Tag all members without a message' },
    { command: 'set_tag_msg', description: 'Update the tagging message' },
    { command: 'about', description: 'About bot and author' }
  ]
};

module.exports = CONSTANTS;

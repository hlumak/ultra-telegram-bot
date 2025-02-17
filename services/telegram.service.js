const { Api, TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const CONSTANTS = require('../configs/constants');

class TelegramService {
  constructor(apiId, apiHash) {
    this.client = new TelegramClient(new StringSession(''), +apiId, apiHash, {
      connectionRetries: 5
    });
  }

  async initialize() {
    try {
      await this.client.start({ botAuthToken: process.env.BOT_TOKEN });
      this.client.session.save();
    } catch (error) {
      console.error('Error starting TelegramClient:', error);
      throw error;
    }
  }

  async getAllMembers(groupId) {
    try {
      const users = [];
      let offset = 0;

      while (true) {
        const participants = await this.client.invoke(
          new Api.channels.GetParticipants({
            channel: groupId,
            filter: new Api.ChannelParticipantsRecent({}),
            offset,
            limit: CONSTANTS.FETCH_LIMIT,
            hash: BigInt('-4156887774564')
          })
        );

        const newUsers = participants.users.filter(user => !user.bot);
        if (!newUsers.length) break;

        users.push(...newUsers);
        offset += CONSTANTS.FETCH_LIMIT;
      }

      return users;
    } catch (error) {
      console.error('Error fetching members:', error);
      return [];
    }
  }
}

module.exports = TelegramService;

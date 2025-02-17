const { Bot } = require('grammy');
const dotenv = require('dotenv');
const CONSTANTS = require('./configs/constants');
const TelegramService = require('./services/telegram.service');
const FirebaseService = require('./services/firebase.service');
const CommandsHandler = require('./handlers/commands.handler');
const MessageHandler = require('./handlers/message.handler');
const { db } = require('./configs/firebaseConfig');

dotenv.config();

class TelegramBot {
  constructor() {
    this.validateEnv();
    this.initializeServices();
    this.setupHandlers();
  }

  validateEnv() {
    const missingEnvVars = CONSTANTS.REQUIRED_ENV_VARS.filter(envVar => !process.env[envVar]);
    if (missingEnvVars.length) {
      throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }
  }

  initializeServices() {
    try {
      this.bot = new Bot(process.env.BOT_TOKEN);
      this.telegramService = new TelegramService(process.env.API_ID, process.env.API_HASH);
      this.firebaseService = new FirebaseService(db);
      this.commandsHandler = new CommandsHandler(this.telegramService, this.firebaseService);
      this.messageHandler = new MessageHandler(this.firebaseService);
    } catch (error) {
      console.error('Failed to initialize services:', error);
      throw error;
    }
  }

  setupHandlers() {
    this.bot.command('about', ctx => this.commandsHandler.handleAbout(ctx));
    this.bot.command(['tag_all', 'tag_all_without_msg'], ctx =>
      this.commandsHandler.handleTagAll(ctx)
    );
    this.bot.command('set_tag_msg', ctx => this.messageHandler.handleSetTagMsg(ctx));
    this.bot.on('message', ctx => this.messageHandler.handlePrivateMessage(ctx));
  }

  async start() {
    try {
      await this.telegramService.initialize();
      await this.bot.api.setMyCommands(CONSTANTS.BOT_COMMANDS);
      await this.bot.start();
      console.log('Bot started successfully');
    } catch (error) {
      console.error('Failed to start bot:', error);
      process.exit(1);
    }
  }
}

const bot = new TelegramBot();
bot.start().catch(console.error);

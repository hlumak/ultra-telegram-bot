# Ultra Telegram Tag Bot 🤖

A powerful Telegram bot that helps manage group conversations by providing advanced member tagging functionality with customizable messages, GIFs, and stickers.

## Features ✨

- **Tag All Members**: Easily mention all group members with a single command
- **Custom Tag Messages**: Set custom text, GIFs, or stickers for tagging
- **Smart Chunking**: Automatically splits large member lists into manageable messages
- **Custom Emoji Support**: Handles custom Telegram emojis in messages
- **Supergroup Support**: Works in both regular groups and supergroups
- **Firebase Integration**: Persistent storage for group settings

## Commands 📋

- `/tag_all` - Tag all group members with the configured message
- `/tag_all_without_msg` - Tag all members without displaying the configured message
- `/set_tag_msg` - Update the tagging message (text, GIF, or sticker)
- `/about` - Display information about the bot and its author

## Setup 🛠️

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account
- Telegram Bot Token
- Telegram API credentials

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Telegram Configuration
BOT_TOKEN=your_bot_token
API_ID=your_api_id
API_HASH=your_api_hash

# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_firebase_sender_id
FIREBASE_APP_ID=your_firebase_app_id
FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ultra-telegram-bot.git
cd ultra-telegram-bot
```

2. Install dependencies:
```bash
npm install
```

3. Start the bot:
```bash
npm start
```

## Usage 💡

1. Add the bot to your Telegram group
2. Grant administrator privileges to the bot
3. Use `/set_tag_msg` to configure your custom tagging message
4. Use `/tag_all` to mention all group members

### Setting Custom Tag Messages

1. **Text Message**: Simply reply to any text message with `/set_tag_msg`
2. **GIF/Sticker**: Reply to a GIF or sticker with `/set_tag_msg`
3. **Private Message**: Use `/set_tag_msg` and send your message to the bot privately

## Technical Details 🔧

- Built with [grammY](https://grammy.dev) Telegram Bot framework
- Uses [GramJS](https://gram.js.org) for member fetching
- Firebase Firestore for data persistence
- Implements message chunking for large groups
- Handles custom emoji entities

## Error Handling 🚨

The bot includes comprehensive error handling for:
- Invalid chat types
- Missing permissions
- API limitations
- Network issues
- Database errors

## License 📝

This project is licensed under the GNU GENERAL PUBLIC License - see the [LICENSE](LICENSE) file for details.

## Author ✍️

- **Author**: Telegram: @v_hlumak
- **GitHub**: [Hlumak](https://github.com/hlumak938)

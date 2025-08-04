const mongoose = require('mongoose');

const BackupDataSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    backupId: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    server: {
        name: String,
        iconURL: String,
        splashURL: String,
        bannerURL: String,
        verificationLevel: Number,
        explicitContentFilter: Number,
        defaultMessageNotifications: Number,
    },
    roles: [Object],
    channels: [Object],
    emojis: [Object],
    bans: [Object],
    messages: [{
        channelId: String,
        messageId: String,
        author: {
            id: String,
            username: String,
            avatarURL: String,
            bot: Boolean,
        },
        content: String,
        embeds: [Object],
        components: [Object],
        createdAt: Date,
    }],
});

module.exports = mongoose.model('BackupData', BackupDataSchema);

const mongoose = require('mongoose');

const userLinkSchema = new mongoose.Schema({
    discordId: {
        type: String,
        required: true,
        unique: true,
    },
    minecraftUUID: {
        type: String,
        required: true,
        unique: true,
    },
    minecraftUsername: {
        type: String,
        required: true,
    },
});

module.exports = mongoose.model('UserLink', userLinkSchema);

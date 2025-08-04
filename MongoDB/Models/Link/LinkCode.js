const mongoose = require('mongoose');

const linkCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        length: 6,
    },
    discordId: {
        type: String,
        required: true,
    },
    minecraftUsername: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '30m', // O documento expira automaticamente após 30 minutos
    },
});

module.exports = mongoose.model('LinkCode', linkCodeSchema);

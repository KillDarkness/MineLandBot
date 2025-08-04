const mongoose = require('mongoose');

const UserEconomySchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    emeralds: { type: Number, default: 0 },
    lastDailyClaim: { type: Date, default: null }, // Adicionado para o daily
    lastWork: { type: Date, default: null },
    lastRob: { type: Date, default: null },
});

const UserEconomy = mongoose.model('UserEconomy', UserEconomySchema);

module.exports = UserEconomy;
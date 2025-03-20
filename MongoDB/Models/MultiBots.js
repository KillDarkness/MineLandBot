// MongoDB/Models/MultiBots.js
const mongoose = require('mongoose');

const MultiBotsSchema = new mongoose.Schema({
    botID: {
        type: String,
        required: true,
        unique: true,
    },
    botToken: {
        type: String,
        required: true,
        unique: true,
    },
    addedBy: {
        type: String,
        required: true,
    },
    prefix: {
        type: String, // Prefixo personalizado para o bot
        default: 'm!', // Prefixo padrão
    },
    activeType: {
        type: String, // Tipo de atividade (Playing, Streaming, Listening, Watching, Custom, Competing)
        default: 'Custom',
    },
    status: {
        type: String, // Status do bot (online, idle, dnd, invisible)
        default: 'online',
    },
    activeMessage: {
        type: String, // Mensagem de atividade
        default: '🎴 Use m!help para ver os comandos!',
    },
    addedAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

MultiBotsSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('MultiBots', MultiBotsSchema);
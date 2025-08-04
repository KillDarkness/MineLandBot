const mongoose = require('mongoose');

const PartnershipSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    representativeId: { type: String, required: false },
    staffId: { type: String, required: true },
    partnershipMessageId: { type: String, required: true },
    botMessageId: { type: String, required: true },
    partnershipChannelId: { type: String, required: true },
    serverName: { type: String, required: true },
    serverLink: { type: String, required: true }, // Adicionado
    presentationMessage: { type: String, required: true }, // Adicionado
    partnershipDate: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    notified: { type: Boolean, default: false },
    active: { type: Boolean, default: true }
});

const Partnership = mongoose.model('Partnership', PartnershipSchema);

module.exports = Partnership;

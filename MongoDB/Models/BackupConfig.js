const mongoose = require('mongoose');

const BackupConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    isEnabled: { type: Boolean, default: false },
    interval: { type: Number, default: 3 }, // Intervalo em dias
    channelsToBackup: { type: [String], default: [] }, // IDs dos canais para salvar mensagens
    lastBackupAt: { type: Date, default: null },
});

module.exports = mongoose.model('BackupConfig', BackupConfigSchema);

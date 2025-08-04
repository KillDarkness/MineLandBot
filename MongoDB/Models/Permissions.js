const mongoose = require('mongoose');

const PermissionSchema = new mongoose.Schema({
    userID: {
        type: String,
        required: true,
        unique: true, // Garante que cada usuário tenha apenas um registro
    },
    group: {
        type: [String], // Agora é um array de strings
        default: ['default'], // Grupo padrão
        enum: ['default', 'master', 'owner', 'admin', 'premium', 'elite', 'vip'], // Grupos permitidos
    },
    createdAt: {
        type: Date,
        default: Date.now, // Data de criação do registro
    },
    updatedAt: {
        type: Date,
        default: Date.now, // Data da última atualização
    },
});

// Atualiza o campo `updatedAt` antes de salvar
PermissionSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Permission', PermissionSchema);
const mongoose = require('mongoose');

const userMessagesSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  guildId: {
    type: String,
    required: true,
    index: true
  },
  username: {
    type: String,
    default: ''
  },
  discriminator: {
    type: String,
    default: ''
  },
  avatar: {
    type: String,
    default: ''
  },
  messages: {
    daily: {
      type: Number,
      default: 0
    },
    weekly: {
      type: Number,
      default: 0
    },
    monthly: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  lastMessageDate: {
    type: Date,
    default: Date.now
  },
  messageHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    count: {
      type: Number,
      default: 1
    }
  }]
}, {
  timestamps: true
});

// Indexes para consultas rápidas
userMessagesSchema.index({ userId: 1, guildId: 1 }, { unique: true });
userMessagesSchema.index({ 'messages.total': -1 });
userMessagesSchema.index({ 'messages.weekly': -1 });

// Middleware para atualizar username/discriminator antes de salvar
userMessagesSchema.pre('save', function(next) {
  if (this.isModified('username') || this.isModified('discriminator')) {
    this.lastUpdated = Date.now();
  }
  next();
});

const UserMessages = mongoose.model('UserMessages', userMessagesSchema);

module.exports = UserMessages;
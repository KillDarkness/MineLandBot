const mongoose = require('mongoose');

const voiceTimeSchema = new mongoose.Schema({
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
  voiceTime: {
    daily: {
      type: Number, // em segundos
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
  lastUpdate: {
    type: Date,
    default: Date.now
  },
  sessions: [{
    joinTime: {
      type: Date,
      required: true
    },
    leaveTime: {
      type: Date
    },
    duration: {
      type: Number // em segundos
    },
    channelId: {
      type: String
    },
    channelName: {
      type: String
    }
  }]
}, {
  timestamps: true
});

// Indexes para consultas rápidas
voiceTimeSchema.index({ userId: 1, guildId: 1 }, { unique: true });
voiceTimeSchema.index({ 'voiceTime.total': -1 });
voiceTimeSchema.index({ 'voiceTime.weekly': -1 });

// Middleware para atualizar username/discriminator
voiceTimeSchema.pre('save', function(next) {
  if (this.isModified('username') || this.isModified('discriminator')) {
    this.lastUpdated = Date.now();
  }
  next();
});

const VoiceTime = mongoose.model('VoiceTime', voiceTimeSchema);

module.exports = VoiceTime;
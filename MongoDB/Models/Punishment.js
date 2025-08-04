const mongoose = require('mongoose');
const { Schema } = mongoose;

const punishmentSchema = new Schema({
  guildID: { 
    type: String, 
    required: true,
    index: true 
  },
  staffID: { 
    type: String, 
    required: true 
  },
  targetID: {
    type: String, 
    required: true,
    index: true
  },
  caseID: { 
    type: String, 
    required: true,
    unique: true 
  },
  punishType: { 
    type: String, 
    required: true,
    enum: ['warn', 'mute', 'kick', 'ban', 'timeout', 'note', 'softban', 'unban', 'unmute'] 
  },
  reason: { 
    type: String, 
    default: 'No reason provided' 
  },
  date: { 
    type: Date, 
    default: Date.now 
  },
  expires: { 
    type: Date, 
    default: null 
  },
  active: { 
    type: Boolean, 
    default: true 
  },
  duration: { 
    type: String, 
    default: null 
  },
  evidence: { 
    type: [String], 
    default: [] 
  },
  referenceCaseID: { 
    type: Number, 
    default: null 
  },
  removedBy: { 
    type: String, 
    default: null 
  },
  removeReason: { 
    type: String, 
    default: null 
  },
  removeDate: { 
    type: Date, 
    default: null 
  },
  
  rolesID: {
    type: [String],
    default: []
  }
});

// Adicionando índices para melhorar consultas frequentes
punishmentSchema.index({ guildID: 1, targetID: 1 });
punishmentSchema.index({ guildID: 1, active: 1 });

module.exports = mongoose.model('Punishment', punishmentSchema);
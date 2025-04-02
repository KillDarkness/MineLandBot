const { Events } = require('discord.js');
const VoiceTime = require('../MongoDB/Models/VoiceTime');
const cron = require('node-cron');

// Objeto para rastrear usuários em call
const activeVoiceUsers = new Map();

// Configuração dos resets automáticos
function setupVoiceTimeResets() {
  // Reset diário às 00:00
  cron.schedule('0 0 * * *', async () => {
    try {
      await VoiceTime.updateMany(
        { 'voiceTime.daily': { $gt: 0 } },
        { $set: { 'voiceTime.daily': 0 } }
      );
      console.log('✅ [VOICE] Contagens diárias de voz resetadas');
    } catch (err) {
      console.error('❌ [VOICE] Erro ao resetar contagens diárias de voz:', err);
    }
  });

  // Reset semanal às 00:00 de domingo
  cron.schedule('0 0 * * 0', async () => {
    try {
      await VoiceTime.updateMany(
        { 'voiceTime.weekly': { $gt: 0 } },
        { $set: { 'voiceTime.weekly': 0 } }
      );
      console.log('✅ [VOICE] Contagens semanais de voz resetadas');
    } catch (err) {
      console.error('❌ [VOICE] Erro ao resetar contagens semanais de voz:', err);
    }
  });

  // Reset mensal no primeiro dia do mês às 00:00
  cron.schedule('0 0 1 * *', async () => {
    try {
      await VoiceTime.updateMany(
        { 'voiceTime.monthly': { $gt: 0 } },
        { $set: { 'voiceTime.monthly': 0 } }
      );
      console.log('✅ [VOICE] Contagens mensais de voz resetadas');
    } catch (err) {
      console.error('❌ [VOICE] Erro ao resetar contagens mensais de voz:', err);
    }
  });
}

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    try {
      const user = newState.member?.user;
      const guild = newState.guild;

      // Ignora bots e casos sem usuário
      if (!user || user.bot) return;

      // Usuário entrou em um canal de voz
      if (!oldState.channelId && newState.channelId) {
        activeVoiceUsers.set(user.id, {
          joinTime: new Date(),
          channelId: newState.channelId,
          channelName: newState.channel?.name || 'Unknown'
        });
      }
      // Usuário saiu/mudou de canal
      else if (oldState.channelId && (!newState.channelId || oldState.channelId !== newState.channelId)) {
        const session = activeVoiceUsers.get(user.id);
        if (!session) {
          return;
        }

        const leaveTime = new Date();
        const duration = Math.floor((leaveTime - session.joinTime) / 1000); // em segundos

        // Atualiza no banco de dados
        try {
          const result = await VoiceTime.findOneAndUpdate(
            { userId: user.id, guildId: guild.id },
            {
              $inc: {
                'voiceTime.daily': duration,
                'voiceTime.weekly': duration,
                'voiceTime.monthly': duration,
                'voiceTime.total': duration
              },
              $set: {
                username: user.username,
                discriminator: user.discriminator,
                avatar: user.displayAvatarURL({ dynamic: true }),
                lastUpdate: leaveTime
              },
              $push: {
                sessions: {
                  joinTime: session.joinTime,
                  leaveTime: leaveTime,
                  duration: duration,
                  channelId: session.channelId,
                  channelName: session.channelName
                }
              }
            },
            { upsert: true, new: true }
          );


          activeVoiceUsers.delete(user.id);
        } catch (error) {
        }
      }
    } catch (error) {
    }
  },
  setupVoiceTimeResets,
  // Método para debug - ver usuários ativos em call
  getActiveVoiceUsers() {
    return activeVoiceUsers;
  }
};
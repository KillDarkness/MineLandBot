const { Events } = require('discord.js');
const UserMessages = require('../MongoDB/Models/UserMessages');
const cron = require('node-cron');

// Configuração dos resets automáticos
function setupAutoResets(client) {
  // Reset diário às 00:00
  cron.schedule('0 0 * * *', async () => {
    try {
      await UserMessages.updateMany(
        { 'messages.daily': { $gt: 0 } },
        { $set: { 'messages.daily': 0 } }
      );
      console.log('✅ Contagens diárias resetadas');
    } catch (err) {
      console.error('❌ Erro ao resetar contagens diárias:', err);
    }
  });

  // Reset semanal às 00:00 de domingo
  cron.schedule('0 0 * * 0', async () => {
    try {
      await UserMessages.updateMany(
        { 'messages.weekly': { $gt: 0 } },
        { $set: { 'messages.weekly': 0 } }
      );
      console.log('✅ Contagens semanais resetadas');
    } catch (err) {
      console.error('❌ Erro ao resetar contagens semanais:', err);
    }
  });

  // Reset mensal no primeiro dia do mês às 00:00
  cron.schedule('0 0 1 * *', async () => {
    try {
      await UserMessages.updateMany(
        { 'messages.monthly': { $gt: 0 } },
        { $set: { 'messages.monthly': 0 } }
      );
      console.log('✅ Contagens mensais resetadas');
    } catch (err) {
      console.error('❌ Erro ao resetar contagens mensais:', err);
    }
  });
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    try {
      const user = message.author;
      const guild = message.guild;
      
      // Atualiza o documento com upsert
      await UserMessages.findOneAndUpdate(
        { userId: user.id, guildId: guild.id },
        {
          $inc: {
            'messages.daily': 1,
            'messages.weekly': 1,
            'messages.monthly': 1,
            'messages.total': 1
          },
          $set: {
            username: user.username,
            discriminator: user.discriminator,
            avatar: user.displayAvatarURL({ dynamic: true }),
            lastMessageDate: new Date()
          },
          $push: {
            messageHistory: {
              date: new Date(),
              count: 1
            }
          }
        },
        { upsert: true, new: true }
      );

    } catch (error) {
      console.error('❌ Erro ao atualizar contagem de mensagens:', error);
    }
  },
  setupAutoResets
};
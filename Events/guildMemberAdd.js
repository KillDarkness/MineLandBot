const { Events } = require('discord.js');
const { checkAndReapplyBan } = require('../functions/CheckBan');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        try {
            // Verifica se o usuário tem ban ativo e reaplica se necessário
            const isBanned = await checkAndReapplyBan(member);
            if (isBanned) {
                return; // Não envia mensagem de boas-vindas para usuários banidos
            }

            // Envia mensagem de boas-vindas para usuários normais no canal específico
            const welcomeChannel = member.guild.channels.cache.get('1340754596649500885');
            if (welcomeChannel) {
                const welcomeMessage = `- 🎉 Olá ${member}, seja muito bem-vindo(a) ao **${member.guild.name}**! 🎉
-# <@&1395811375363784844>, deem as boas-vindas ao nosso novo membro! 😃`;
                await welcomeChannel.send(welcomeMessage);
            }
        } catch (error) {
            // Erro silencioso
        }
    }
};
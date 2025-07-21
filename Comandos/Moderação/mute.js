const MentionUser = require('../../Package/MentionUser');
const Moderation = require('../../Package/Moderation');

module.exports = {
    name: 'mute',
    description: '🔇 » Silencia um usuário no servidor.',
    async execute(message, args) {
        const input = args[0]; // Pega a menção, ID ou tag do usuário
        const timeStr = args[1]; // Pega a string de tempo (ex: '10m', '2h', '1d')
        const reason = args.slice(2).join(' ') || 'Sem motivo fornecido.';

        if (!input) {
            return message.reply('🛑 » Você precisa mencionar um usuário, fornecer um ID ou uma tag.');
        }

        // Busca o usuário com base na entrada
        const targetUser = await MentionUser.getUser(message.client, input, message.guild);
        if (!targetUser) {
            return message.reply('🛑 » Usuário não encontrado.');
        }

        const target = message.guild.members.cache.get(targetUser.id);
        if (!target) {
            return message.reply('🛑 » Usuário não está no servidor.');
        }

        // Realiza a ação de mute usando o Moderation.js
        // Agora passa a string de tempo diretamente, deixando o Moderation.js fazer a conversão
        const result = await Moderation.mute(message.member, target, reason, timeStr);
        message.reply(result);
    },
};
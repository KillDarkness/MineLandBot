const MentionUser = require('../../Package/MentionUser');
const Moderation = require('../../Package/Moderation');

module.exports = {
    name: 'unmute',
    description: '🔊 » Remove o silêncio de um usuário no servidor.',
    async execute(message, args) {
        const input = args[0]; // Pega a menção, ID ou tag do usuário
        const reason = args.slice(1).join(' ') || 'Sem motivo fornecido.';

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

        // Realiza a ação de unmute usando o Moderation.js
        const result = await Moderation.unmute(message.member, target, reason);
        message.reply(result);
    },
};
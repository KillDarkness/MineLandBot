const MentionUser = require('../../Package/MentionUser');
const Moderation = require('../../Package/Moderation');

module.exports = {
    name: 'unban',
    description: '🔓 » Desbane um usuário do servidor.',
    async execute(message, args) {
        const input = args[0]; // Pega o ID ou a tag do usuário
        const reason = args.slice(1).join(' ') || 'Sem motivo fornecido.';

        if (!input) {
            return message.reply('🛑 » Você precisa fornecer o ID ou a tag do usuário.');
        }

        // Busca o usuário com base na entrada
        const targetUser = await MentionUser.getUser(message.client, input, message.guild);
        if (!targetUser) {
            return message.reply('🛑 » Usuário não encontrado.');
        }

        // Realiza a ação de unban usando o Moderation.js
        const result = await Moderation.unban(message.member, targetUser, reason);
        message.reply(result);
    },
};
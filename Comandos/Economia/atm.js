const UserEconomy = require('../../MongoDB/Models/UserEconomy');
const MentionUser = require('../../Package/MentionUser');

module.exports = {
    name: 'atm',
    aliases: ['bal', 'balance', 'money', 'emeralds'],
    description: 'Verifica o saldo de esmeraldas de um usuário.',
    async execute(message, args, client) {
        let targetUser = message.author;

        if (args[0]) {
            const mentioned = await MentionUser.getUser(client, args[0], message.guild);
            if (mentioned) {
                targetUser = mentioned;
            } else {
                return message.reply('❌ Usuário não encontrado. Por favor, mencione um usuário válido ou forneça um ID/tag.');
            }
        }

        let userEconomy = await UserEconomy.findOne({ userId: targetUser.id });

        if (!userEconomy) {
            userEconomy = new UserEconomy({ userId: targetUser.id });
            await userEconomy.save();
        }

        const emeraldsFormatted = userEconomy.emeralds.toLocaleString('pt-BR'); // Formata para leitura fácil

        if (targetUser.id === message.author.id) {

            message.reply(`💎 » Olá, ${message.author.username}! Atualmente você possui **${emeraldsFormatted}** Esmeraldas em sua conta.`);
        } else {
            message.reply(`💎 » O usuário **${targetUser.username}** possui **${emeraldsFormatted}** Esmeraldas em sua conta.`);

        }
    },
};
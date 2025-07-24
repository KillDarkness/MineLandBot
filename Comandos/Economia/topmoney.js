const UserEconomy = require('../../MongoDB/Models/UserEconomy');
const generateLeaderboardImage = require('../../functions/generateLeaderboardImage');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
    name: 'topmoney',
    aliases: ['leaderboard', 'rank', 'top'],
    description: 'Exibe o ranking dos usuários com mais esmeraldas em uma imagem.',
    async execute(message, args, client) {
        await message.channel.sendTyping();
        // Buscar os 10 usuários com mais esmeraldas
        const topUsers = await UserEconomy.find()
            .sort({ emeralds: -1 })
            .limit(10);

        if (topUsers.length === 0) {
            return message.reply('Parece que ninguém tem esmeraldas ainda! Comece a usar os comandos de economia para aparecer no ranking.');
        }

        // Gerar a imagem do leaderboard
        const imageBuffer = await generateLeaderboardImage(client, topUsers);

        // Criar um anexo com a imagem
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'leaderboard.png' });

        // Enviar a imagem
        message.reply({ files: [attachment] });
    },
};
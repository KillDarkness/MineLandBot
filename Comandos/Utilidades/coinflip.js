const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'coinflip',
    description: '🪙 » Joga uma moeda (cara ou coroa).',
    aliases: ['cf', 'moeda'],
    execute(message) {
        const result = Math.random() < 0.5 ? 'Cara' : 'Coroa';

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setDescription(`🪙 » Resultado: **${result}**`)

        message.reply({ embeds: [embed] });
    },
};
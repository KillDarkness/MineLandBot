const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'uptime',
    description: '⏱️ » Mostra há quanto tempo o bot está online.',
    aliases: ['up'],
    execute(message) {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setDescription(`⏱️ » Estou online há **${hours}h ${minutes}m ${seconds}s**.`)
            .setFooter({ text: `Solicitado por ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

        message.reply({ embeds: [embed] });
    },
};
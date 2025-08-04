const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
    name: 'resume',
    description: 'Retoma a música que estava pausada',
    async execute(message) {
        const player = message.client.riffy.players.get(message.guild.id);

        if (!player) return message.channel.send("❌ Nenhuma música está tocando no momento.");
        if (!player.paused) return message.channel.send("❌ A música não está pausada.");

        player.pause(false);

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setDescription("▶️ Música retomada.");

        message.channel.send({ embeds: [embed] });
    }
};
const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
    name: 'pause',
    description: 'Pausa a música que está tocando',
    async execute(message) {
        const player = message.client.riffy.players.get(message.guild.id);

        if (!player) return message.channel.send("❌ Nenhuma música está tocando no momento.");
        if (player.paused) return message.channel.send("❌ A música já está pausada.");

        player.pause(true);

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setDescription("⏸️ Música pausada.");

        message.channel.send({ embeds: [embed] });
    }
};
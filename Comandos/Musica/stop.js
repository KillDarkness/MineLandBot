const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
    name: 'stop',
    description: 'Para a música e limpa a fila',
    async execute(message) {
        const player = message.client.riffy.players.get(message.guild.id);

        if (!player) return message.channel.send("❌ Nenhuma música está tocando no momento.");

        player.destroy();

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setDescription("⏹️ Música parada e fila limpa.");

        message.channel.send({ embeds: [embed] });
    }
};
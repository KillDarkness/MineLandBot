const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
    name: 'skip',
    description: 'Pula a música atual',
    async execute(message) {
        const player = message.client.riffy.players.get(message.guild.id);

        if (!player) return message.channel.send("❌ Nenhuma música está tocando no momento.");
        if (!player.queue.length) return message.channel.send("❌ Não há músicas na fila para pular.");

        player.stop();

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setDescription("⏭️ Música pulada.");

        message.channel.send({ embeds: [embed] });
    }
};
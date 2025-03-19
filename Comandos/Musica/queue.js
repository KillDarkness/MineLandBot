const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
    name: 'queue',
    description: 'Mostra a fila de músicas',
    async execute(message) {
        const player = message.client.riffy.players.get(message.guild.id);

        if (!player) return message.channel.send("❌ Nenhuma música está tocando no momento.");
        if (!player.queue.length) return message.channel.send("❌ A fila está vazia.");

        const queue = player.queue.map((track, index) => 
            `**${index + 1}.** [${track.info.title}](${track.info.uri}) - ${track.info.requester.tag}`
        ).join("\n");

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle("🎶 Fila de Músicas")
            .setDescription(queue);

        message.channel.send({ embeds: [embed] });
    }
};
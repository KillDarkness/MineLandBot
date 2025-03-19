const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
    name: 'nowplaying',
    description: 'Mostra a música que está tocando no momento',
    async execute(message) {
        const player = message.client.riffy.players.get(message.guild.id);

        if (!player || !player.queue.current) return message.channel.send("❌ Nenhuma música está tocando no momento.");

        const track = player.queue.current;

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle("🎶 Tocando Agora")
            .setDescription(`[${track.info.title}](${track.info.uri})`)
            .addFields(
                { name: "Artista", value: track.info.author, inline: true },
                { name: "Duração", value: track.info.duration ? formatDuration(track.info.duration) : "AO VIVO", inline: true },
                { name: "Solicitado por", value: track.info.requester.tag, inline: true }
            )
            .setThumbnail(track.info.thumbnail || null);

        message.channel.send({ embeds: [embed] });
    }
};

function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));

    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
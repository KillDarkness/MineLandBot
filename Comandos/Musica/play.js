const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
    name: 'play',
    description: 'Play a song or playlist',
    async execute(message, args) {
        const query = args.join(" ");
        if (!query) return message.channel.send("❌ Por favor, forneça uma música ou playlist!");

        // Verifica se o usuário está em um canal de voz
        if (!message.member.voice.channel) {
            return message.channel.send("❌ Você precisa estar em um canal de voz para usar este comando!");
        }

        try {
            // Cria uma conexão com o Riffy
            const player = message.client.riffy.createConnection({
                guildId: message.guild.id,
                voiceChannel: message.member.voice.channel.id,
                textChannel: message.channel.id,
                deaf: true,
            });

            // Resolve a consulta (música ou playlist)
            const resolve = await message.client.riffy.resolve({
                query: query,
                requester: message.author,
            });

            const { loadType, tracks, playlistInfo } = resolve;

            if (loadType === "playlist") {
                // Adiciona todas as faixas da playlist à fila
                for (const track of resolve.tracks) {
                    track.info.requester = message.author;
                    player.queue.add(track);
                }

                const embed = new EmbedBuilder()
                    .setColor(config.embedColor)
                    .setTitle("✅ Playlist Adicionada")
                    .setDescription(`**${playlistInfo.name}**`)
                    .addFields([
                        { name: 'Total de Músicas', value: `${tracks.length} músicas`, inline: true },
                        { name: 'Solicitado por', value: `${message.author.tag}`, inline: true }
                    ]);

                message.channel.send({ embeds: [embed] });
                if (!player.playing && !player.paused) player.play(); // Inicia a reprodução
            } else if (loadType === "search" || loadType === "track") {
                // Adiciona uma única música à fila
                const track = tracks.shift();
                track.info.requester = message.author;
                const position = player.queue.length + 1;
                player.queue.add(track);

                const embed = new EmbedBuilder()
                    .setColor(config.embedColor)
                    .setTitle("✅ Música Adicionada à Fila")
                    .setDescription(`[${track.info.title}](${track.info.uri})`)
                    .addFields([
                        { name: 'Artista', value: track.info.author, inline: true },
                        { name: 'Duração', value: track.info.duration ? formatDuration(track.info.duration) : 'AO VIVO', inline: true },
                        { name: 'Posição', value: `#${position}`, inline: true }
                    ]);

                message.channel.send({ embeds: [embed] });
                if (!player.playing && !player.paused) player.play(); // Inicia a reprodução
            } else {
                return message.channel.send("❌ Nenhum resultado encontrado! Tente com outro termo de pesquisa.");
            }
        } catch (error) {
            console.error(error);
            return message.channel.send("❌ Ocorreu um erro ao tentar tocar a música! Tente novamente mais tarde.");
        }
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
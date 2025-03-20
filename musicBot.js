const { Riffy } = require("riffy");
const { Spotify } = require("riffy-spotify");
const { GatewayDispatchEvents, EmbedBuilder } = require("discord.js");
const config = require("./config.js");

module.exports = (client) => {
    const spotify = new Spotify({
        clientId: config.spotify.clientId,
        clientSecret: config.spotify.clientSecret
    });

    // Inicializa o Riffy
    client.riffy = new Riffy(client, config.nodes, {
        send: (payload) => {
            const guild = client.guilds.cache.get(payload.d.guild_id);
            if (guild) guild.shard.send(payload);
        },
        defaultSearchPlatform: "ytmsearch",
        restVersion: "v4",
        plugins: [spotify]
    });

    // Evento: Quando o bot está pronto
    client.on("ready", () => {
        client.riffy.init(client.user.id); // Inicializa o Riffy
    });

    // Evento: Quando o nó do Lavalink é conectado
    client.riffy.on("nodeConnect", (node) => {
    });

    // Evento: Quando ocorre um erro no nó do Lavalink
    client.riffy.on("nodeError", (node, error) => {
        console.log(`❌ Node "${node.name}" encountered an error: ${error.message}.`);
    });

    // Evento: Quando uma música começa a tocar
    client.riffy.on("trackStart", async (player, track) => {
        const channel = client.channels.cache.get(player.textChannel);

        // Formata a duração da música
        const duration = track.info.duration ? formatDuration(track.info.duration) : "🎙️ AO VIVO";

        // Resolve a URL da thumbnail (se for uma Promise)
        const thumbnail = await Promise.resolve(track.info.thumbnail).catch(() => null);

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setTitle(`🎶 Tocando Agora: ${track.info.title}`)
            .setURL(track.info.uri)
            .addFields(
                { name: "🎤 Artista", value: track.info.author, inline: true },
                { name: "⏳ Duração", value: duration, inline: true },
                { name: "👤 Solicitado por", value: track.info.requester.tag, inline: true }
            )
            .setThumbnail(thumbnail || null); // Usa a thumbnail resolvida ou null

        channel.send({ embeds: [embed] });
    });

    // Evento: Quando a fila termina
    client.riffy.on("queueEnd", async (player) => {
        const channel = client.channels.cache.get(player.textChannel);

        const embed = new EmbedBuilder()
            .setColor("#FF0000")
            .setDescription("❌ A lista de reprodução terminou. Aguardando 1 minuto antes de sair...");

        channel.send({ embeds: [embed] });

        // Aguarda 1 minuto antes de sair
        setTimeout(() => {
            const embed = new EmbedBuilder()
                .setColor("#FF0000")
                .setDescription("❌ Não há mais músicas na lista. Saindo do canal de voz...");

            channel.send({ embeds: [embed] });
            player.destroy();
        }, 60000); // 1 minuto
    });

    // Evento: Quando o bot é mutado ou kicado
    const muteTimers = new Map();

    client.on("voiceStateUpdate", (oldState, newState) => {
        if (newState.id === client.user.id) {
            const player = client.riffy.players.get(newState.guild.id);

            if (!player) return;

            // Bot foi kicado
            if (!newState.channelId) {
                const channel = client.channels.cache.get(player.textChannel);

                if (muteTimers.has(newState.guild.id)) {
                    clearTimeout(muteTimers.get(newState.guild.id));
                    muteTimers.delete(newState.guild.id);
                }

                const embed = new EmbedBuilder()
                    .setColor("#FF0000")
                    .setDescription("❌ Fui expulso do canal de voz. Saindo...");

                channel.send({ embeds: [embed] });
                player.destroy();
            }

            // Bot foi mutado
            if (newState.serverMute) {
                const channel = client.channels.cache.get(player.textChannel);

                const embed = new EmbedBuilder()
                    .setColor("#FFA500")
                    .setDescription("🔇 Fui mutado. Pausando a música por 3 minutos...");

                channel.send({ embeds: [embed] });
                player.pause(true);

                const timer = setTimeout(() => {
                    if (newState.serverMute) {
                        const embed = new EmbedBuilder()
                            .setColor("#FF0000")
                            .setDescription("❌ Ainda estou mutado. Saindo do canal de voz...");

                        channel.send({ embeds: [embed] });
                        player.destroy();
                    } else {
                        const embed = new EmbedBuilder()
                            .setColor("#00FF00")
                            .setDescription("🔉 Mutado removido. Retomando a música...");

                        channel.send({ embeds: [embed] });
                        player.pause(false);
                    }
                    muteTimers.delete(newState.guild.id);
                }, 180000); // 3 minutos

                muteTimers.set(newState.guild.id, timer);
            } else if (muteTimers.has(newState.guild.id)) {
                clearTimeout(muteTimers.get(newState.guild.id));
                muteTimers.delete(newState.guild.id);

                const embed = new EmbedBuilder()
                    .setColor("#00FF00")
                    .setDescription("🔉 Mutado removido. Retomando a música...");

                const channel = client.channels.cache.get(player.textChannel);
                channel.send({ embeds: [embed] });
                player.pause(false);
            }
        }
    });

    // Evento: Atualiza o estado de voz do bot
    client.on("raw", (d) => {
        if (![GatewayDispatchEvents.VoiceStateUpdate, GatewayDispatchEvents.VoiceServerUpdate].includes(d.t)) return;
        client.riffy.updateVoiceState(d);
    });
};

// Função para formatar a duração
function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));

    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
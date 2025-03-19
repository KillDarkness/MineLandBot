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

        const embed = new EmbedBuilder()
            .setColor(config.embedColor) // Use a cor definida no config.js
            .setTitle(`🎶 Tocando Agora: ${track.info.title}`)
            .setURL(track.info.uri) // Link incorporado no título
            .addFields(
                { name: "🎤 Artista", value: track.info.author, inline: true },
                { name: "⏳ Duração", value: duration, inline: true },
                { name: "👤 Solicitado por", value: track.info.requester.tag, inline: true }
            )
            .setThumbnail(track.info.thumbnail || null); // Thumbnail da música (se disponível)

        channel.send({ embeds: [embed] });
    });

    // Evento: Quando a fila termina
    client.riffy.on("queueEnd", async (player) => {
        const channel = client.channels.cache.get(player.textChannel);

        const embed = new EmbedBuilder()
            .setColor("#FF0000") // Vermelho claro
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
    const muteTimers = new Map(); // Armazena os timers de mute

    client.on("voiceStateUpdate", (oldState, newState) => {
        // Verifica se o bot foi mutado ou kicado
        if (newState.id === client.user.id) {
            const player = client.riffy.players.get(newState.guild.id);

            if (!player) return;

            // Bot foi kicado
            if (!newState.channelId) {
                const channel = client.channels.cache.get(player.textChannel);

                // Verifica se o bot estava mutado
                if (muteTimers.has(newState.guild.id)) {
                    clearTimeout(muteTimers.get(newState.guild.id)); // Para o contador de mute
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
                    .setColor("#FFA500") // Laranja
                    .setDescription("🔇 Fui mutado. Pausando a música por 3 minutos...");

                channel.send({ embeds: [embed] });
                player.pause(true);

                // Armazena o timer para cancelar se necessário
                const timer = setTimeout(() => {
                    if (newState.serverMute) {
                        const embed = new EmbedBuilder()
                            .setColor("#FF0000")
                            .setDescription("❌ Ainda estou mutado. Saindo do canal de voz...");

                        channel.send({ embeds: [embed] });
                        player.destroy();
                    } else {
                        const embed = new EmbedBuilder()
                            .setColor("#00FF00") // Verde
                            .setDescription("🔉 Mutado removido. Retomando a música...");

                        channel.send({ embeds: [embed] });
                        player.pause(false);
                    }
                    muteTimers.delete(newState.guild.id); // Remove o timer
                }, 180000); // 3 minutos

                muteTimers.set(newState.guild.id, timer); // Armazena o timer
            } else if (muteTimers.has(newState.guild.id)) {
                // Se o bot foi desmutado, cancela o timer
                clearTimeout(muteTimers.get(newState.guild.id));
                muteTimers.delete(newState.guild.id);

                const embed = new EmbedBuilder()
                    .setColor("#00FF00") // Verde
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
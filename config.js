require('dotenv').config();

module.exports = {
    prefix: 'm.',
    embedColor: "#0061FF", 

    // ------------------------------------------------------

    nodes: [{
        host: process.env.LAVALINK_HOST,
        password: process.env.LAVALINK_PASSWORD,
        port: parseInt(process.env.LAVALINK_PORT),
        secure: process.env.LAVALINK_SECURE === 'true', 
        name: "Main Node"
    }],
    spotify: {
        clientId: process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET
    },

    // ------------------------------------------------------

    punishRoles: {
        mute: "1340754462574247957",
        ban: "1340754463778017331",
    },

    // ------------------------------------------------------

    linkConfirmationChannelId: "YOUR_CHANNEL_ID",

    // Status do bot (online, idle, dnd, invisible)
    statusType: "online",

    atividades: {
        type: 'Custom', // Use um valor válido: Playing, Streaming, Listening, Watching, Custom, Competing
        text: `💚 Use m.help para ver os comandos!!`,
    },

    // ------------------------------------------------------
};
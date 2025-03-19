require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const Handler = require('./Handler/Handler.js');
const musicBot = require('./musicBot');

const client = new Client({
    intents: Object.values(GatewayIntentBits), // Todas as intents
    partials: Object.values(Partials), // Todos os partials
});

// Configuração do Riffy e eventos relacionados à música
musicBot(client);

// Carrega todos os handlers
Handler(client);

// Inicia o bot
client.login(process.env.BOT_TOKEN);
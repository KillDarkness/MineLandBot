require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const Handler = require('./Handler/Handler.js');

const client = new Client({
    intents: Object.values(GatewayIntentBits), // Todas as intents
    partials: Object.values(Partials), // Todos os partials
});

// Carrega todos os handlers
Handler(client);

// Inicia o bot
client.login(process.env.BOT_TOKEN);
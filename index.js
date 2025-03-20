require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const Handler = require('./Handler/Handler.js');
const musicBot = require('./musicBot');
const connect = require('./MongoDB/connect'); // Importa a função de conexão

const client = new Client({
    intents: Object.values(GatewayIntentBits), // Todas as intents
    partials: Object.values(Partials), // Todos os partials
});

// Configuração do Riffy e eventos relacionados à música
musicBot(client);

// Carrega todos os handlers
Handler(client);

connect();

// Inicia o bot
client.login(process.env.BOT_TOKEN);
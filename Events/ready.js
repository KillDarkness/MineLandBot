const { ActivityType, Events } = require('discord.js');
const config = require('../config.js');
const MultiBots = require('../MongoDB/Models/MultiBots.js');
const nomeEvent = require('./MultiBots.js'); 
const checkPartnershipRenewals = require('../functions/checkPartnershipRenewals.js');
const initializeBackupScheduler = require('./backupScheduler.js');
const startHttpServer = require('../http/server');
const { checkArtifacts } = require('../functions/checkArtifacts.js');

module.exports = {
    name: 'ready', // Nome do evento
    once: true, // Executa apenas uma vez
    async execute(client) {
        startHttpServer(client); // Inicia o servidor HTTP
        // Define o status personalizado do bot principal
        client.user.setPresence({
            activities: [{
                name: config.atividades.text,
                type: ActivityType[config.atividades.type],
            }],
            status: config.statusType, 
        });

        // Exibe a mensagem de "ready"
        console.log(`😃 » Estou Online com ${client.user.tag}!`);

        // Busca todos os bots registrados na base de dados
        const bots = await MultiBots.find({});

        // Inicia cada bot registrado
        for (const bot of bots) {
            try {
                // Inicia o bot sem tentar adicioná-lo novamente
                await nomeEvent.execute(bot.botID, bot.botToken, bot.prefix, false);
            } catch (error) {
                console.error(`❌ Erro ao iniciar o bot ${bot.botID}:`, error);
            }
        }

        // Run partnership renewal check on startup and then every 24 hours
        checkPartnershipRenewals(client);
        setInterval(() => checkPartnershipRenewals(client), 24 * 60 * 60 * 1000); // Every 24 hours
        initializeBackupScheduler(client);
        checkArtifacts(client);
    },
};
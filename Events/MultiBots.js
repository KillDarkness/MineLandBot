const { Client, GatewayIntentBits, Partials, ActivityType } = require('discord.js');
const CommandsHandler = require('../Handler/CommandsHandler.js'); // Importa o CommandsHandler
const MultiBots = require('../MongoDB/Models/MultiBots.js'); // Importa o schema MultiBots

module.exports = {
    name: 'multibots', // Nome do evento
    once: true, // Executa apenas uma vez
    async execute(botID, botToken, prefix = 'm!', shouldAdd = true) { // Adiciona o parâmetro `shouldAdd`
        try {
            // Cria uma nova instância do bot
            const newBot = new Client({
                intents: Object.values(GatewayIntentBits),
                partials: Object.values(Partials),
            });

            // Carrega os comandos e handlers para o novo bot
            CommandsHandler(newBot);

            // Inicia o bot
            await newBot.login(botToken);

            // Busca as informações do bot na base de dados (se já estiver registrado)
            const botData = await MultiBots.findOne({ botID: newBot.user.id });

            // Define o status e a atividade do bot
            await newBot.user.setPresence({
                activities: [{
                    name: botData?.activeMessage || '🎴 Use m!help para ver os comandos!', // Mensagem de atividade
                    type: ActivityType[botData?.activeType || 'Custom'], // Tipo de atividade
                }],
                status: botData?.status || 'online', // Status do bot (online, idle, dnd, invisible)
            });

            // Adiciona o bot à base de dados apenas se `shouldAdd` for true
            if (shouldAdd) {
                const multiBot = new MultiBots({
                    botID: newBot.user.id,
                    botToken,
                    prefix, // Prefixo personalizado
                    addedBy: '758347932914155572', // ID do dono do bot
                    activeType: 'Custom', // Tipo de atividade padrão
                    status: 'online', // Status padrão
                    activeMessage: '🎴 Use m!help para ver os comandos!', // Mensagem de atividade padrão
                });

                await multiBot.save();
            }

            console.log(`🍙 » Bot ${newBot.user.tag} iniciado com sucesso!`);
        } catch (error) {
            console.error('Erro ao iniciar o bot:', error);
        }
    },
};
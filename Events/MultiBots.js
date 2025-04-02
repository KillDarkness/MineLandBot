const { Client, GatewayIntentBits, Partials, ActivityType } = require('discord.js');
const CommandsHandler = require('../Handler/CommandsHandler.js');
const MultiBots = require('../MongoDB/Models/MultiBots.js');

// Armazena as instâncias ativas dos bots
const activeBots = new Map();

module.exports = {
    name: 'multibots',
    once: true,
    async execute(
        botID, 
        botToken, 
        prefix = 'm!', 
        addedBy = '758347932914155572', 
        shouldAdd = true, 
        activeType = 'Custom', 
        status = 'online',
        activeMessage = '🎴 Use m!help para ver os comandos!'
    ) {
        try {
            // Verificação básica de token
            if (!botToken || botToken.length < 50 || !botToken.match(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)) {
                throw new Error('Token inválido. Formato incorreto.');
            }

            // Verificação básica de ID
            if (!botID || !botID.match(/^\d+$/)) {
                throw new Error('ID do bot inválido. Deve ser um número.');
            }
            
            // Busca dados do bot no banco de dados antes de iniciar
            let dbBot = null;
            try {
                dbBot = await MultiBots.findOne({ botID });
            } catch (dbError) {
                console.error('Erro ao buscar bot no banco de dados:', dbError);
                // Continua com os valores padrão se não conseguir buscar da DB
            }
            
            // Se o bot existir no banco de dados, usa esses valores em vez dos padrões
            if (dbBot) {
                prefix = dbBot.prefix || prefix;
                activeType = dbBot.activeType || activeType;
                status = dbBot.status || status;
                activeMessage = dbBot.activeMessage || activeMessage;
                // Não substituímos o token pois o fornecido na chamada pode ser mais recente
            }
            
            // Verificação do activeType (após possível atualização do banco de dados)
            if (!Object.keys(ActivityType).includes(activeType)) {
                throw new Error(`Tipo de atividade inválido: ${activeType}`);
            }
            
            // Verificação do status (após possível atualização do banco de dados)
            const validStatuses = ['online', 'idle', 'dnd', 'invisible'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Status inválido: ${status}`);
            }
            
            // Verifica se já existe uma instância do bot rodando e a desconecta
            if (activeBots.has(botID)) {
                try {
                    const existingBot = activeBots.get(botID);
                    await existingBot.destroy();
                    activeBots.delete(botID);
                    console.log(`🍙 » Bot ${botID} desconectado para reinicialização`);
                } catch (destroyError) {
                    console.error(`Erro ao desconectar o bot ${botID}:`, destroyError);
                    // Continua a execução para tentar criar uma nova instância
                }
            }
            
            // Cria uma nova instância do bot
            const newBot = new Client({
                intents: Object.values(GatewayIntentBits),
                partials: Object.values(Partials),
            });
            
            // Carrega os comandos e handlers para o novo bot
            CommandsHandler(newBot);
            
            // Inicia o bot com timeout para evitar esperas longas
            const loginPromise = newBot.login(botToken);
            
            // Timeout de 15 segundos para o login
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Tempo de login excedido')), 15000);
            });
            
            // Utiliza Promise.race para implementar o timeout
            await Promise.race([loginPromise, timeoutPromise]);
            
            // Se chegou aqui, o login foi bem-sucedido
            
            // Define o status e a atividade do bot usando os parâmetros fornecidos ou da DB
            await newBot.user.setPresence({
                activities: [{
                    name: activeMessage,
                    type: ActivityType[activeType],
                }],
                status: status,
            });
            
            // Adiciona ou atualiza o bot na base de dados
            if (shouldAdd) {
                try {
                    if (dbBot) {
                        // Atualiza as informações existentes
                        dbBot.botToken = botToken;
                        dbBot.prefix = prefix;
                        dbBot.addedBy = addedBy;
                        dbBot.activeType = activeType;
                        dbBot.status = status;
                        dbBot.activeMessage = activeMessage;
                        await dbBot.save();
                    } else {
                        // Cria um novo registro
                        const multiBot = new MultiBots({
                            botID: newBot.user.id,
                            botToken,
                            prefix,
                            addedBy,
                            activeType,
                            status,
                            activeMessage,
                        });
                        await multiBot.save();
                    }
                } catch (dbError) {
                    console.error('Erro ao salvar bot no banco de dados:', dbError);
                    // Continua a execução, pois o bot já está logado
                }
            }
            
            // Armazena a instância do bot no mapa de bots ativos
            activeBots.set(botID, newBot);
            
            console.log(`🍙 » Bot ${newBot.user.tag} iniciado com sucesso.`);
            return newBot; // Retorna a instância do bot
        } catch (error) {
            console.error('Erro ao iniciar o bot:', error);
            throw error; // Repassa o erro para ser tratado pelo chamador
        }
    },
    
    // Nova função para desconectar um bot específico
    async disconnectBot(botID) {
        try {
            // Verifica se o bot está ativo
            if (!activeBots.has(botID)) {
                console.log(`🍙 » Bot ${botID} não está conectado`);
                return false;
            }
            
            // Obtém a instância do bot e a desconecta
            const bot = activeBots.get(botID);
            await bot.destroy();
            activeBots.delete(botID);
            
            console.log(`🍙 » Bot ${botID} desconectado com sucesso`);
            return true;
        } catch (error) {
            console.error(`Erro ao desconectar o bot ${botID}:`, error);
            return false;
        }
    }
};
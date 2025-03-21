const { Events, ActivityType } = require('discord.js');
const MultiBots = require('../MongoDB/Models/MultiBots.js');
const multibotsEvent = require('./MultiBots.js');

module.exports = {
    name: 'channelMonitor',
    once: false,
    async execute(client) {
        const CHANNEL_ID = '1352426014453792859';
        
        
        // Função para processar mensagens no canal
        const processMessage = async (message) => {
            // Ignora mensagens de outros canais
            if (message.channelId !== CHANNEL_ID) return;
            
            // Ignora mensagens do próprio bot
            if (message.author.id === client.user.id) return;
            
            try {
                // Verifica se a mensagem tem o formato correto
                const lines = message.content.trim().split('\n');
                
                // Verifica se tem pelo menos 8 linhas e se a primeira é "Register"
                if (lines.length < 8 || lines[0].trim().toLowerCase() !== "register") {
                    // Não responde ao usuário para evitar spam
                    return;
                }
                
                const botToken = lines[1].trim();
                const botID = lines[2].trim();
                const prefix = lines[3].trim();
                const addedBy = lines[4].trim();
                const activeType = lines[5].trim();
                const status = lines[6].trim();
                const activeMessage = lines[7].trim();
                
                // Validação básica do token
                if (!botToken || botToken.length < 50 || !botToken.match(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)) {
                    await message.reply('❌ Token inválido. Verifique o formato e tente novamente.').catch(console.error);
                    return;
                }
                
                // Validação do ID
                if (!botID || !botID.match(/^\d+$/)) {
                    await message.reply('❌ ID do bot inválido. Deve ser um número.').catch(console.error);
                    return;
                }
                
                // Validação do activeType
                const validActivityTypes = Object.keys(ActivityType);
                if (!validActivityTypes.includes(activeType)) {
                    await message.reply(`❌ Tipo de atividade inválido. Use um dos seguintes: ${validActivityTypes.join(', ')}`).catch(console.error);
                    return;
                }
                
                // Validação do status
                const validStatuses = ['online', 'idle', 'dnd', 'invisible'];
                if (!validStatuses.includes(status)) {
                    await message.reply(`❌ Status inválido. Use um dos seguintes: ${validStatuses.join(', ')}`).catch(console.error);
                    return;
                }
                
                // Verifica se o bot já existe no banco de dados
                const existingBot = await MultiBots.findOne({ botID });
                
                try {
                    if (existingBot) {
                        // Atualiza as informações do bot
                        existingBot.botToken = botToken;
                        existingBot.prefix = prefix;
                        existingBot.addedBy = addedBy;
                        existingBot.activeType = activeType;
                        existingBot.status = status;
                        existingBot.activeMessage = activeMessage;
                        await existingBot.save();
                        
                        
                        // Tenta restartar o bot
                        try {
                            const newBot = await multibotsEvent.execute(
                                botID, 
                                botToken, 
                                prefix, 
                                addedBy, 
                                false, 
                                activeType, 
                                status, 
                                activeMessage
                            );
                            
                            if (newBot) {
                                await message.reply(`✅ Bot atualizado e reiniciado com sucesso!\nTag: ${newBot.user.tag}\nID: ${botID}\nPrefix: ${prefix}\nTipo de Atividade: ${activeType}\nStatus: ${status}`).catch(console.error);
                            } else {
                                await message.reply(`⚠️ Bot atualizado no banco de dados, mas houve erro ao iniciar. Verifique o token.`).catch(console.error);
                            }
                        } catch (botError) {
                            console.error('Erro ao reiniciar o bot:', botError);
                            await message.reply(`⚠️ Bot atualizado no banco de dados, mas houve erro ao iniciar: ${botError.message}`).catch(console.error);
                        }
                    } else {
                        // Tenta iniciar o novo bot
                        try {
                            const newBot = await multibotsEvent.execute(
                                botID, 
                                botToken, 
                                prefix, 
                                addedBy, 
                                true, 
                                activeType, 
                                status, 
                                activeMessage
                            );
                            
                            if (newBot) {
                                await message.reply(`✅ Novo bot adicionado e iniciado com sucesso!\nTag: ${newBot.user.tag}\nID: ${botID}\nPrefix: ${prefix}\nTipo de Atividade: ${activeType}\nStatus: ${status}`).catch(console.error);
                            } else {
                                await message.reply(`❌ Erro ao adicionar o bot. Verifique o token e tente novamente.`).catch(console.error);
                            }
                        } catch (botError) {
                            console.error('Erro ao iniciar o bot:', botError);
                            await message.reply(`❌ Erro ao adicionar o bot: ${botError.message}`).catch(console.error);
                        }
                    }
                } catch (dbError) {
                    console.error('Erro ao interagir com o banco de dados:', dbError);
                    await message.reply(`❌ Erro de banco de dados: ${dbError.message}`).catch(console.error);
                }
                
                // Tenta apagar a mensagem para proteger o token
                if (message.deletable) {
                    await message.delete().catch(e => console.log('Não foi possível excluir a mensagem:', e));
                }
                
            } catch (error) {
                console.error('Erro ao processar mensagem para adicionar bot:', error);
                await message.reply('❌ Ocorreu um erro ao processar sua solicitação. Verifique o console para mais detalhes.').catch(console.error);
            }
        };
        
        // Configura os event listeners para mensagens
        client.on(Events.MessageCreate, processMessage);
        
        // Também monitora edições de mensagens
        client.on(Events.MessageUpdate, (oldMessage, newMessage) => processMessage(newMessage));
        
    }
};
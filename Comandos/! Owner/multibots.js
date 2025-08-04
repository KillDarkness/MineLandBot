const { Client, GatewayIntentBits, Partials } = require('discord.js');
const MultiBots = require('../../MongoDB/Models/MultiBots.js');
const nomeEvent = require('../../Events/MultiBots.js'); // Importa o evento MultiBots

module.exports = {
    name: 'multibots',
    description: 'Adiciona ou remove bots multi-instância (apenas para o dono do bot)',
    async execute(message, args) {
        const ownerID = '758347932914155572'; // ID do dono do bot
        if (message.author.id !== ownerID) {
            return message.reply('❌ Você não tem permissão para usar este comando.');
        }

        const action = args[0]; // 'add' ou 'remove'
        const botToken = args[1];
        const prefix = args[2] || 'm!'; // Prefixo personalizado (opcional)

        if (!action || !botToken) {
            return message.reply('❌ Uso correto: `m!multibots <add/remove> <token> [prefixo]`');
        }

        try {
            if (action === 'add') {
                // Verifica se o bot já foi adicionado
                const existingBot = await MultiBots.findOne({ botToken });
                if (existingBot) {
                    return message.reply(`❌ Este bot já foi adicionado (ID: ${existingBot.botID}).`);
                }

                // Inicia o bot com o prefixo personalizado e adiciona à base de dados
                await nomeEvent.execute(null, botToken, prefix, true); // Passa `true` para adicionar

                message.reply(`✅ Bot adicionado e iniciado com sucesso! Prefixo: \`${prefix}\``);
            } else if (action === 'remove') {
                // Remove o bot do banco de dados
                const bot = await MultiBots.findOneAndDelete({ botToken });

                if (!bot) {
                    return message.reply('❌ Bot não encontrado.');
                }

                message.reply(`✅ Bot <@${bot.botID}> removido com sucesso!`);
            } else {
                return message.reply('❌ Ação inválida. Use `add` ou `remove`.');
            }
        } catch (error) {
            console.error('Erro ao gerenciar multi-bots:', error);
            message.reply('❌ Ocorreu um erro ao gerenciar multi-bots.');
        }
    },
};
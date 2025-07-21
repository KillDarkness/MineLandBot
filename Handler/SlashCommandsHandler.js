const fs = require('fs');
const path = require('path');
const { Collection, Routes } = require('discord.js');
const config = require('../config.js');
const MultiBots = require('../MongoDB/Models/MultiBots.js');

module.exports = async (client) => {
    // Coleção para armazenar os comandos
    client.slashCommands = new Collection();
    const commandsArray = [];

    // Carrega os comandos
    const commandsPath = path.join(__dirname, '../Comandos Slash'); // Nome da pasta com espaço
    const categoryFolders = fs.readdirSync(commandsPath);

    for (const folder of categoryFolders) {
        const categoryPath = path.join(commandsPath, folder);
        const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const command = require(path.join(categoryPath, file));
            
            // Adiciona categoria e adiciona ao collection
            command.category = folder;
            client.slashCommands.set(command.data.name, command);
            commandsArray.push(command.data.toJSON());
        }
    }

    // Função para desregistrar todos os comandos globais
    const unregisterGlobalCommands = async () => {
        try {
            await client.rest.put(
                Routes.applicationCommands(client.user.id),
                { body: [] }
            );
            console.log('🔖 » Todos os comandos globais foram desregistrados');
        } catch (error) {
            console.error('Erro ao desregistrar comandos globais:', error);
        }
    };

    // Função para desregistrar comandos de uma guild específica
    const unregisterGuildCommands = async (guildId) => {
        try {
            await client.rest.put(
                Routes.applicationGuildCommands(client.user.id, guildId),
                { body: [] }
            );
            console.log(`🔖 » Comandos desregistrados para a guild ${guildId}`);
        } catch (error) {
            console.error(`Erro ao desregistrar comandos da guild ${guildId}:`, error);
        }
    };

    // Registra os comandos globalmente ou por guild
    const registerCommands = async () => {
        try {
            // Verifica se é multibot e obtém guildId específica se necessário
            let guildId = null;
            const bot = await MultiBots.findOne({ botID: client.user.id });
            if (bot && bot.guildID) guildId = bot.guildID;

            // Primeiro desregistra todos os comandos existentes
            await unregisterGlobalCommands();
            if (guildId) await unregisterGuildCommands(guildId);

            // Depois registra os novos comandos
            if (guildId) {
                // Registra apenas para uma guild específica
                await client.rest.put(
                    Routes.applicationGuildCommands(client.user.id, guildId),
                    { body: commandsArray }
                );
                console.log(`🔖 » Registrados ${commandsArray.length} comandos para a guild ${guildId}`);
            } else {
                // Registra globalmente
                await client.rest.put(
                    Routes.applicationCommands(client.user.id),
                    { body: commandsArray }
                );
                console.log(`🔖 » Registrados ${commandsArray.length} comandos globalmente`);
            }
        } catch (error) {
            console.error('Erro ao registrar slash commands:', error);
        }
    };

    // Atualiza os comandos quando o bot estiver pronto
    client.once('ready', async () => {
        await registerCommands();
        
        // Opcional: Agendar para recarregar os comandos periodicamente
        // setInterval(registerCommands, 86400000); // 24 horas
    });

    // Evento: Interação (slash command)
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        const command = client.slashCommands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction, client);
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: '🛑 » Ocorreu um erro ao executar este comando!', 
                ephemeral: true 
            });
        }
    });
};
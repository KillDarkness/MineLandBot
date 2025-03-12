const fs = require('fs');
const path = require('path');
const config = require('../config.js');

module.exports = (client) => {
    // Carrega os comandos
    client.commands = new Map();
    const commandsPath = path.join(__dirname, '../Comandos');
    const categoryFolders = fs.readdirSync(commandsPath);

    for (const folder of categoryFolders) {
        const categoryPath = path.join(commandsPath, folder);
        const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const command = require(path.join(categoryPath, file));
            command.category = folder; // Adiciona a categoria ao comando
            client.commands.set(command.name, command);
        }
    }

    // Evento: Quando uma mensagem é criada
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return; // Ignora mensagens de outros bots

        // Verifica se a mensagem começa com o prefixo
        if (!message.content.startsWith(config.prefix)) return;

        // Separa o comando e os argumentos
        const args = message.content.slice(config.prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // Busca o comando na lista de comandos
        const command = client.commands.get(commandName);
        if (!command) return;

        // Executa o comando
        try {
            await command.execute(message, args);
        } catch (error) {
            console.error(error);
            message.reply('🛑 » Ocorreu um erro ao executar o comando.');
        }
    });
};
const fs = require('fs');
const path = require('path');
const config = require('../config.js');
const MultiBots = require('../MongoDB/Models/MultiBots.js'); // Importa o schema MultiBots

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
        // Verifica se a mensagem foi enviada por um bot
        if (message.author.bot) return;

        // Obtém o prefixo do bot
        let prefix = config.prefix; // Prefixo padrão

        // Verifica se o bot é um multibot e obtém o prefixo personalizado
        const bot = await MultiBots.findOne({ botID: message.client.user.id });
        if (bot) {
            prefix = bot.prefix; // Usa o prefixo do multibot
        }

        // Verifica se a mensagem começa com o prefixo
        if (!message.content.startsWith(prefix)) return;

        // Separa o comando e os argumentos
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // Busca o comando na lista de comandos
        const command = client.commands.get(commandName);
        if (!command) {
            return message.reply('🛑 » Este comando não foi __Encontrado__.');
        }

        // Executa o comando
        try {
            await command.execute(message, args);
        } catch (error) {
            console.error(error);
            message.reply('🛑 » Ocorreu um erro ao executar o comando.');
        }
    });
};
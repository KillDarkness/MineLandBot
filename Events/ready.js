const { ActivityType } = require('discord.js');
const config = require('../config.js');

module.exports = {
    name: 'ready', // Nome do evento
    once: true, // Executa apenas uma vez
    execute(client) {
        // Define o status personalizado
        client.user.setPresence({
            activities: [{
                name: config.status.text,
                type: ActivityType.Custom,
            }],
            status: 'online', // Status do bot (online, idle, dnd, invisible)
        });

        // Exibe a mensagem de "ready"
        console.log(`😃 » Estou Online com ${client.user.tag}!`);
    },
};
const fs = require('fs');
const path = require('path');
const CommandsHandler = require('./CommandsHandler.js');

module.exports = (client) => {
    // Carrega o handler de comandos
    CommandsHandler(client);

    // Carrega os eventos
    const eventsPath = path.join(__dirname, '../Events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const event = require(path.join(eventsPath, file));
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
};
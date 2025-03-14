const fs = require('fs');
const path = require('path');
const CommandsHandler = require('./CommandsHandler.js');
const EventsHandler = require('./EventsHandler.js');
const PackageHandler = require('./PackageHandler.js')

module.exports = (client) => {
    // Carrega o handler de comandos
    CommandsHandler(client);
    EventsHandler(client);
    PackageHandler(client)
    require('./AliasHandler');

};
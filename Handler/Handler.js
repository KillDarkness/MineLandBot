const fs = require('fs');
const path = require('path');
const CommandsHandler = require('./CommandsHandler.js');
const Slash = require('./SlashCommandsHandler.js');
const EventsHandler = require('./EventsHandler.js');
const PackageHandler = require('./PackageHandler.js');
const MongoHandler = require('./MongoHandler.js')
const FunctionsHandler = require('./FunctionsHandler.js')

module.exports = (client) => {
    // Carrega o handler de comandos
    CommandsHandler(client);
    EventsHandler(client);
    PackageHandler(client);
    MongoHandler(client);
    FunctionsHandler(client);
    Slash(client)
    require('./AliasHandler');

};
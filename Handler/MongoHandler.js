const fs = require('fs');
const path = require('path');
require('../MongoDB/connect.js');

module.exports = (client) => {
    const modelsPath = path.join(__dirname, '../MongoDB/Models');
    const modelsFiles = fs.readdirSync(modelsPath).filter(file => file.endsWith('.js'));

    for (const file of modelsFiles) {
        const models = require(path.join(modelsPath, file));
        if (models.once) {
            client.once(models.name, (...args) => models.execute(...args, client));
        } else {
            client.on(models.name, (...args) => models.execute(...args, client));
        }
    }
}
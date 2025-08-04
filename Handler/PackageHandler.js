const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const packagePath = path.join(__dirname, '../Package');
    const eventFiles = fs.readdirSync(packagePath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const event = require(path.join(packagePath, file));
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
}
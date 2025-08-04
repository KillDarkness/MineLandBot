const Inventory = require('../../MongoDB/Models/Inventory');
const Artifacts = require('../../MongoDB/Models/Artifacts');
const items = require('../../assets/items.json');
const ms = require('ms');

module.exports = {
    name: 'use',
    aliases: ['usar'],
    description: 'Usa um item do seu inventário.',
    async execute(message, args) {
        const itemIdentifier = args.join(' ');
        if (!itemIdentifier) {
            return message.reply('Você precisa especificar o ID ou o nome do item que deseja usar.');
        }

        const item = items.find(i => i.id === itemIdentifier || i.name.toLowerCase() === itemIdentifier.toLowerCase());
        if (!item) {
            return message.reply('Item não encontrado.');
        }

        const userId = message.author.id;
        const userInventory = await Inventory.findOne({ userId });

        if (!userInventory || !userInventory.items.some(i => i.itemId === item.id)) {
            return message.reply('Você não possui este item em seu inventário.');
        }

        if (item.type === 'artifact') {
            const userArtifacts = await Artifacts.findOne({ userId });
            if (userArtifacts && userArtifacts.artifacts.length >= 4) {
                return message.reply('Você já atingiu o limite de 4 artefatos equipados.');
            }

            const duration = userInventory.items.find(i => i.itemId === item.id).duration || item.duration;
            const expiresAt = new Date(Date.now() + ms(duration));

            await Artifacts.findOneAndUpdate(
                { userId },
                { $push: { artifacts: { artifactId: item.id, expiresAt } } },
                { upsert: true, new: true }
            );

            await removeItemFromInventory(userId, item.id, 1);
            return message.reply(`Você usou o artefato ${item.name} com duração de ${duration}.`);
        }

        // Lógica para usar itens normais (caixas, etc.) pode ser adicionada aqui
        message.reply(`Você usou ${item.name}.`);
        await removeItemFromInventory(userId, item.id, 1);
    },
};

async function removeItemFromInventory(userId, itemId, quantity) {
    const userInventory = await Inventory.findOne({ userId });
    const itemIndex = userInventory.items.findIndex(i => i.itemId === itemId);

    if (itemIndex > -1) {
        userInventory.items[itemIndex].quantity -= quantity;
        if (userInventory.items[itemIndex].quantity <= 0) {
            userInventory.items.splice(itemIndex, 1);
        }
        await userInventory.save();
    }
}
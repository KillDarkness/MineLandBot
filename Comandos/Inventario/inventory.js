const Inventory = require('../../MongoDB/Models/Inventory');
const Permissions = require('../../MongoDB/Models/Permissions');
const MentionUser = require('../../Package/MentionUser');
const items = require('../../assets/items.json');
const generateInventoryImage = require('../../functions/generateInventoryImage');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
    name: 'inventory',
    aliases: ['inv', 'inventario'],
    description: 'Mostra seu inventário ou dá itens para outros usuários (apenas para masters).',
    async execute(message, args, client) {
        const authorPermissions = await Permissions.findOne({ userID: message.author.id });
        const isMaster = authorPermissions && authorPermissions.group.includes('master');

        if (isMaster && args[0] && args[0].toLowerCase() === 'give') {
            const targetUser = await MentionUser.getUser(client, args[1], message.guild);
            const itemId = args[2];
            const quantity = parseInt(args[3], 10);

            if (!targetUser || !itemId || isNaN(quantity) || quantity <= 0) {
                return message.reply('Uso incorreto. `m.give <@user> <item_id> <quantity>`');
            }

            const item = items.find(i => i.id === itemId);
            if (!item) {
                return message.reply('Item não encontrado.');
            }

            await addItemToInventory(targetUser.id, itemId, quantity);
            return message.reply(`Você deu ${quantity}x ${item.name} para ${targetUser.username}.`);
        }

        await message.channel.sendTyping();

        const userId = message.author.id;
        const userInventory = await Inventory.findOne({ userId });

        const inventoryItems = userInventory ? userInventory.items : [];
        const imageBuffer = await generateInventoryImage(inventoryItems);
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'inventory.png' });

        message.reply({ files: [attachment] });
    },
};

async function addItemToInventory(userId, itemId, quantity) {
    let userInventory = await Inventory.findOne({ userId });

    if (!userInventory) {
        userInventory = await Inventory.create({ userId, items: [{ itemId, quantity }] });
        return;
    }

    const itemIndex = userInventory.items.findIndex(i => i.itemId === itemId);

    if (itemIndex > -1) {
        userInventory.items[itemIndex].quantity += quantity;
    } else {
        userInventory.items.push({ itemId, quantity });
    }

    await userInventory.save();
}
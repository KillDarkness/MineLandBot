const Inventory = require('../../MongoDB/Models/Inventory');
const Permissions = require('../../MongoDB/Models/Permissions');
const MentionUser = require('../../Package/MentionUser');
const items = require('../../assets/items.json');

module.exports = {
    name: 'give',
    aliases: [],
    description: 'Dá um item para um usuário.',
    async execute(message, args, client) {
        const authorPermissions = await Permissions.findOne({ userID: message.author.id });
        if (!authorPermissions || !authorPermissions.group.includes('master')) {
            return message.reply('Você não tem permissão para usar este comando.');
        }

        const targetUser = await MentionUser.getUser(client, args[0], message.guild);
        const itemId = args[1];
        const quantity = parseInt(args[2], 10) || 1;

        if (!targetUser || !itemId || quantity <= 0) {
            return message.reply('Uso incorreto. `m.give <@user> <item_id> [quantity]`');
        }

        const item = items.find(i => i.id === itemId);
        if (!item) {
            return message.reply('Item não encontrado.');
        }

        await addItemToInventory(targetUser.id, itemId, quantity, item.type === 'artifact' ? '7d' : null);
        message.reply(`Você deu ${quantity}x ${item.name} para ${targetUser.username}.`);
    },
};

async function addItemToInventory(userId, itemId, quantity, duration) {
    let userInventory = await Inventory.findOne({ userId });

    if (!userInventory) {
        userInventory = await Inventory.create({ userId, items: [{ itemId, quantity, duration }] });
        return;
    }

    const itemIndex = userInventory.items.findIndex(i => i.itemId === itemId);

    if (itemIndex > -1) {
        userInventory.items[itemIndex].quantity += quantity;
    } else {
        userInventory.items.push({ itemId, quantity, duration });
    }

    await userInventory.save();
}
const Artifacts = require('../../MongoDB/Models/Artifacts');
const Permissions = require('../../MongoDB/Models/Permissions');
const MentionUser = require('../../Package/MentionUser');
const ms = require('ms');
const items = require('../../assets/items.json');
const Inventory = require('../../MongoDB/Models/Inventory');
const generateArtifactsImage = require('../../functions/generateArtifactsImage');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
    name: 'artefatos',
    aliases: ['artifacts'],
    description: 'Mostra seus artefatos ativos ou gerencia artefatos de outros usuários (apenas para masters).',
    async execute(message, args, client) {
        const authorPermissions = await Permissions.findOne({ userID: message.author.id });
        const isMaster = authorPermissions && authorPermissions.group.includes('master');

        if (isMaster && args.length > 0) {
            const subCommand = args[0].toLowerCase();
            const targetUser = await MentionUser.getUser(client, args[1], message.guild);
            const artifactId = args[2];
            const duration = args[3];

            const item = items.find(i => i.id === artifactId);

            if (subCommand === 'add') {
                if (!targetUser || !artifactId || !duration) {
                    return message.reply('Uso incorreto. `m.artefato add <@user> <artifact_id> <duration>`');
                }

                if (!item || item.type !== 'artifact') {
                    return message.reply('Artefato não encontrado.');
                }

                const expiresAt = duration.toLowerCase() === 'infinity' ? null : new Date(Date.now() + ms(duration));
                await addArtifact(targetUser.id, artifactId, expiresAt);
                return message.reply(`O artefato ${item.name} foi adicionado para ${targetUser.username} com duração ${duration}.`);
            } else if (subCommand === 'remove') {
                if (!targetUser || !artifactId) {
                    return message.reply('Uso incorreto. `m.artefato remove <@user> <artifact_id>`');
                }

                if (!item || item.type !== 'artifact') {
                    return message.reply('Artefato não encontrado.');
                }

                await removeArtifact(targetUser.id, artifactId);
                return message.reply(`O artefato ${item.name} foi removido de ${targetUser.username}.`);
            } else if (subCommand === 'create') {
                if (!targetUser || !artifactId || !duration) {
                    return message.reply('Uso incorreto. `m.artefato create <@user> <artifact_id> <duration>`');
                }

                if (!item || item.type !== 'artifact') {
                    return message.reply('Artefato não encontrado.');
                }

                await addItemToInventory(targetUser.id, artifactId, 1, duration);
                return message.reply(`Você criou 1x ${item.name} com duração de ${duration} para ${targetUser.username}.`);
            }
        }

        await message.channel.sendTyping();

        const userId = message.author.id;
        const userArtifacts = await Artifacts.findOne({ userId });

        const artifacts = userArtifacts ? userArtifacts.artifacts : [];
        const imageBuffer = await generateArtifactsImage(artifacts);
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'artifacts.png' });

        message.reply({ files: [attachment] });
    },
};

async function addArtifact(userId, artifactId, expiresAt) {
    await Artifacts.findOneAndUpdate(
        { userId },
        { $push: { artifacts: { artifactId, expiresAt } } },
        { upsert: true, new: true }
    );
}

async function removeArtifact(userId, artifactId) {
    await Artifacts.updateOne({ userId }, { $pull: { artifacts: { artifactId } } });
}

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
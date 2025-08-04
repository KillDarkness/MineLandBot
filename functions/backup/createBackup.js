const BackupData = require('../../MongoDB/Models/BackupData');
const { ChannelType } = require('discord.js');
const { v4: uuidv4 } = require('uuid');

async function fetchAllMessages(channel) {
    let allMessages = [];
    let lastId;

    while (true) {
        const options = { limit: 100 };
        if (lastId) {
            options.before = lastId;
        }

        const messages = await channel.messages.fetch(options).catch(() => null);
        if (!messages || messages.size === 0) break;

        allMessages = allMessages.concat(Array.from(messages.values()));
        lastId = messages.last().id;
    }

    return allMessages;
}

async function createBackup(guild, channelsToBackupIds = []) {
    try {
        // Verifica se o guild e seus dados estão acessíveis
        if (!guild || !guild.channels?.cache || !guild.roles?.cache) {
            throw new Error('Informações da guild estão inacessíveis.');
        }

        const serverData = {
            name: guild.name,
            iconURL: guild.iconURL({ dynamic: true }),
            splashURL: guild.splashURL(),
            bannerURL: guild.bannerURL(),
            verificationLevel: guild.verificationLevel,
            explicitContentFilter: guild.explicitContentFilter,
            defaultMessageNotifications: guild.defaultMessageNotifications,
        };

        const roles = guild.roles.cache
            .filter(r => !r.managed)
            .sort((a, b) => b.position - a.position)
            .map(role => ({
                name: role.name,
                color: role.hexColor,
                hoist: role.hoist,
                permissions: role.permissions.bitfield.toString(),
                mentionable: role.mentionable,
                position: role.position,
            }));

        const channelsData = [];
        const allChannels = await guild.channels.fetch();

        // Process all channels (categories and regular channels)
        for (const channel of allChannels.values()) {
            channelsData.push({
                id: channel.id,
                name: channel.name,
                type: channel.type,
                position: channel.position,
                parentId: channel.parentId,
                topic: channel.topic,
                nsfw: channel.nsfw,
                rateLimitPerUser: channel.rateLimitPerUser,
                // Add a flag for categories to easily identify them later
                isCategory: channel.type === ChannelType.GuildCategory,
            });
        }

        // Sort channels to maintain order (categories first, then children)
        channelsData.sort((a, b) => {
            // Sort by position first
            if (a.position !== b.position) {
                return a.position - b.position;
            }
            // Then by type (categories before other channels)
            if (a.type === ChannelType.GuildCategory && b.type !== ChannelType.GuildCategory) {
                return -1;
            }
            if (a.type !== ChannelType.GuildCategory && b.type === ChannelType.GuildCategory) {
                return 1;
            }
            return 0;
        });

        const emojis = guild.emojis?.cache?.map(emoji => ({
            name: emoji.name,
            url: emoji.imageURL(),
        })) || [];

        const bans = (await guild.bans.fetch().catch(() => []))?.map(ban => ({
            id: ban.user.id,
            reason: ban.reason,
        })) || [];

        let messages = [];

        if (channelsToBackupIds.length > 0) {
            for (const channelId of channelsToBackupIds) {
                const channel = guild.channels.cache.get(channelId);

                if (channel && channel.type === ChannelType.GuildText) {
                    const channelMessages = await fetchAllMessages(channel);

                    messages.push(...channelMessages.map(msg => ({
                        channelId: msg.channelId,
                        messageId: msg.id,
                        author: {
                            id: msg.author.id,
                            username: msg.author.username,
                            avatarURL: msg.author.displayAvatarURL({ dynamic: true }),
                            bot: msg.author.bot,
                        },
                        content: msg.content,
                        embeds: msg.embeds.map(e => e.toJSON()),
                        components: msg.components.map(c => c.toJSON()),
                        createdAt: msg.createdAt,
                    })));
                }
            }
        }

        const backup = new BackupData({
            guildId: guild.id,
            backupId: uuidv4(),
            server: serverData,
            roles,
            channels: channelsData,
            emojis,
            bans,
            messages,
        });

        await backup.save();
        return { success: true, backupId: backup.backupId };
    } catch (error) {
        console.error('Erro ao criar backup:', error);
        return { success: false, error: error.message };
    }
}

module.exports = createBackup;

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const BackupConfig = require('../../MongoDB/Models/BackupConfig');
const Permissions = require('../../MongoDB/Models/Permissions');
const createBackup = require('../../functions/backup/createBackup');
const BackupData = require('../../MongoDB/Models/BackupData');
const moment = require('moment');

module.exports = {
    name: 'backup',
    description: 'Gerencia os backups do servidor.',
    async execute(message, args, client) {
        const authorPerms = await Permissions.findOne({ userID: message.author.id });

        if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && (!authorPerms || !authorPerms.group.includes('master'))) {
            return message.reply('Você não tem permissão para usar este comando.');
        }

        const subcommand = args[0];
        const guildId = message.guild.id;

        if (!subcommand) {
            return message.reply('Por favor, especifique uma ação: `enable`, `disable`, `create`, `interval`, `channels` ou `list`.');
        }

        switch (subcommand.toLowerCase()) {
            case 'enable':
            case 'ativar': {
                await BackupConfig.findOneAndUpdate(
                    { guildId },
                    { isEnabled: true },
                    { upsert: true, new: true }
                );
                return message.reply('✅ | Backups automáticos foram **ativados**.');
            }

            case 'disable':
            case 'desativar': {
                await BackupConfig.findOneAndUpdate(
                    { guildId },
                    { isEnabled: false },
                    { upsert: true, new: true }
                );
                return message.reply('❌ | Backups automáticos foram **desativados**.');
            }

            case 'create': {
                await message.reply('Iniciando backup manual, isso pode levar alguns minutos...');
                const config = await BackupConfig.findOne({ guildId });
                const channelsToBackup = config ? config.channelsToBackup : [];

                const { success, backupId, error } = await createBackup(message.guild, channelsToBackup);

                if (success) {
                    return message.channel.send(`✅ | Backup manual criado com sucesso! **ID do Backup:** \`${backupId}\``);
                } else {
                    return message.channel.send(`❌ | Falha ao criar o backup: ${error}`);
                }
            }

            case 'interval':
            case 'intervalo': {
                if (!authorPerms || !authorPerms.group.includes('master')) {
                    return message.reply('Apenas membros da equipe **Master** podem alterar o intervalo de backup.');
                }
                const newInterval = parseInt(args[1]);
                if (isNaN(newInterval) || newInterval <= 0) {
                    return message.reply('Por favor, forneça um número de dias válido para o intervalo.');
                }

                await BackupConfig.findOneAndUpdate(
                    { guildId },
                    { interval: newInterval },
                    { upsert: true, new: true }
                );
                return message.reply(`✅ | O intervalo de backup foi definido para **${newInterval}** dias.`);
            }

            case 'channels': {
                if (!authorPerms || !authorPerms.group.includes('master')) {
                    return message.reply('Apenas membros da equipe **Master** podem gerenciar os canais de backup.');
                }
                const action = args[1];
                const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[2]);

                if (!action || (action !== 'add' && action !== 'remove')) {
                    return message.reply('Use `backup channels <add/remove> <#canal>`.');
                }

                if (!channel || channel.type !== ChannelType.GuildText) {
                    return message.reply('Por favor, mencione um canal de texto válido.');
                }

                if (action === 'add') {
                    await BackupConfig.findOneAndUpdate(
                        { guildId },
                        { $addToSet: { channelsToBackup: channel.id } },
                        { upsert: true }
                    );
                    return message.reply(`✅ | O canal <#${channel.id}> foi **adicionado** à lista de backup de mensagens.`);
                } else if (action === 'remove') {
                    await BackupConfig.findOneAndUpdate(
                        { guildId },
                        { $pull: { channelsToBackup: channel.id } },
                        { upsert: true }
                    );
                    return message.reply(`✅ | O canal <#${channel.id}> foi **removido** da lista de backup de mensagens.`);
                }
                break;
            }

            case 'list': {
                const backups = await BackupData.find({ guildId }).sort({ createdAt: -1 });

                if (backups.length === 0) {
                    return message.reply('Não há backups disponíveis para este servidor.');
                }

                const firstBackup = backups[backups.length - 1];
                const lastBackup = backups[0];

                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('📜 Lista de Backups do Servidor')
                    .setDescription(`Aqui estão os backups disponíveis para **${message.guild.name}**.`)
                    .addFields(
                        { name: 'Total de Backups', value: `\`${backups.length}\``, inline: true },
                        { name: 'Último Backup', value: moment(lastBackup.createdAt).format('DD/MM/YYYY HH:mm:ss'), inline: true },
                        { name: 'Backup Mais Antigo', value: moment(firstBackup.createdAt).format('DD/MM/YYYY HH:mm:ss'), inline: true }
                    )
                    .setThumbnail(message.guild.iconURL({ dynamic: true }))
                    .setFooter({ text: 'Selecione um backup no menu abaixo para ver mais detalhes.' });

                let currentPage = 0;
                const backupsPerPage = 25;

                const generateComponents = (page) => {
                    const start = page * backupsPerPage;
                    const end = start + backupsPerPage;
                    const currentBackups = backups.slice(start, end);

                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId('select_backup')
                        .setPlaceholder('Selecione um backup para ver os detalhes')
                        .addOptions(currentBackups.map(backup => ({
                            label: `Backup de ${moment(backup.createdAt).format('DD/MM/YYYY HH:mm:ss')}`,
                            description: `ID: ${backup.backupId}`,
                            value: backup.backupId,
                        })));

                    const row = new ActionRowBuilder().addComponents(selectMenu);

                    const buttons = new ActionRowBuilder();
                    if (backups.length > backupsPerPage) {
                        buttons.addComponents(
                            new ButtonBuilder()
                                .setCustomId('prev_page')
                                .setLabel('Anterior')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(page === 0),
                            new ButtonBuilder()
                                .setCustomId('next_page')
                                .setLabel('Próximo')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(end >= backups.length)
                        );
                    }

                    return [row, buttons];
                };

                const components = generateComponents(currentPage);
                const reply = await message.reply({ embeds: [embed], components: components.filter(c => c.components.length > 0) });

                const collector = reply.createMessageComponentCollector({
                    componentType: ComponentType.StringSelect | ComponentType.Button,
                    time: 300000 // 5 minutos
                });

                collector.on('collect', async i => {
                    await i.deferUpdate();

                    if (i.isButton()) {
                        if (i.customId === 'prev_page') {
                            currentPage--;
                        } else if (i.customId === 'next_page') {
                            currentPage++;
                        }
                        const newComponents = generateComponents(currentPage);
                        await reply.edit({ components: newComponents.filter(c => c.components.length > 0) });
                        return;
                    }

                    if (i.isStringSelectMenu()) {
                        const backupId = i.values[0];
                        const selectedBackup = await BackupData.findOne({ backupId });

                        if (!selectedBackup) {
                            return i.followUp({ content: 'Backup não encontrado.', ephemeral: true });
                        }

                        const maxFieldLength = 1000;

                        let rolesContent = selectedBackup.roles.map(r => r.name).join('\n');
                        if (rolesContent.length > maxFieldLength) {
                            rolesContent = rolesContent.substring(0, maxFieldLength) + '... (e mais)';
                        }
                        const rolesList = rolesContent || 'Nenhum cargo salvo.';

                        let channelsContent = '';
                        const allChannels = selectedBackup.channels;

                        // Group channels by category
                        const categorizedChannels = new Map();
                        const uncategorizedChannels = [];

                        for (const channel of allChannels) {
                            if (channel.isCategory) {
                                categorizedChannels.set(channel.id, { ...channel, children: [] });
                            } else if (channel.parentId) {
                                const parentCategory = categorizedChannels.get(channel.parentId);
                                if (parentCategory) {
                                    parentCategory.children.push(channel);
                                } else {
                                    // Fallback for channels with invalid parentId
                                    uncategorizedChannels.push(channel);
                                }
                            } else {
                                uncategorizedChannels.push(channel);
                            }
                        }

                        // Sort categories by position
                        const sortedCategories = Array.from(categorizedChannels.values()).sort((a, b) => a.position - b.position);

                        // Add uncategorized channels first
                        if (uncategorizedChannels.length > 0) {
                            channelsContent += 'Sem Categoria:\n';
                            uncategorizedChannels.sort((a, b) => a.position - b.position).forEach(c => {
                                const icon = c.type === ChannelType.GuildText ? '# ' : (c.type === ChannelType.GuildVoice ? '🔊 ' : '');
                                channelsContent += `  ${icon}${c.name}\n`;
                            });
                        }

                        // Add categorized channels
                        for (const category of sortedCategories) {
                            channelsContent += `\n${category.name}:\n`;
                            category.children.sort((a, b) => a.position - b.position).forEach(c => {
                                const icon = c.type === ChannelType.GuildText ? '# ' : (c.type === ChannelType.GuildVoice ? '🔊 ' : '');
                                channelsContent += `  ${icon}${c.name}\n`;
                            });
                        }

                        if (channelsContent.length > maxFieldLength) {
                            channelsContent = channelsContent.substring(0, maxFieldLength) + '... (e mais)';
                        }
                        const channelsList = channelsContent || 'Nenhum canal salvo.';

                        const detailsEmbed = new EmbedBuilder()
                            .setColor('#0099ff')
                            .setTitle(`✨ Detalhes do Backup: ${selectedBackup.backupId}`)
                            .setThumbnail(selectedBackup.server.iconURL)
                            .addFields(
                                { name: '🏷️ Nome do Servidor', value: selectedBackup.server.name, inline: true },
                                { name: '📅 Data de Criação', value: moment(selectedBackup.createdAt).format('DD/MM/YYYY HH:mm:ss'), inline: true },
                            );

                        const serverEmbed = new EmbedBuilder()
                            .setColor('#FFFFFF')
                            .addFields(
                                { name: '📺 Canais', value: `\`\`\`\n${channelsList}\n\`\`\``, inline: true },
                                { name: '📜 Cargos', value: `\`\`\`\n${rolesList}\n\`\`\``, inline: true }
                            );

                        const otherEmbed = new EmbedBuilder()
                            .setColor('#6c757d')
                            .addFields(
                                { name: '😀 Emojis', value: `\`\`\`${selectedBackup.emojis.length}\`\`\``, inline: true },
                                { name: '🔨 Bans', value: `\`\`\`${selectedBackup.bans.length}\`\`\``, inline: true },
                                { name: '💬 Mensagens Que foram Salvas', value: `\`\`\`${selectedBackup.messages.length}\`\`\``, inline: true }
                            );

                        await reply.edit({ embeds: [detailsEmbed, serverEmbed, otherEmbed], components: [] });
                        collector.stop();
                    }
                });

                collector.on('end', collected => {
                    if (collected.size === 0) {
                        const timedOutEmbed = new EmbedBuilder()
                            .setColor('#dc3545')
                            .setTitle('Tempo Esgotado')
                            .setDescription('Você não fez nenhuma seleção a tempo.');
                        reply.edit({ embeds: [timedOutEmbed], components: [] });
                    }
                });
                break;
            }

            case 'info': {
                const backupId = args[1];
                if (!backupId) {
                    return message.reply('Por favor, forneça o ID do backup para ver os detalhes. Ex: `m.backup info <ID_DO_BACKUP>`');
                }

                const selectedBackup = await BackupData.findOne({ backupId });

                if (!selectedBackup) {
                    return message.reply('Backup não encontrado.');
                }

                const maxFieldLength = 1000;

                let rolesContent = selectedBackup.roles.map(r => r.name).join('\n');
                if (rolesContent.length > maxFieldLength) {
                    rolesContent = rolesContent.substring(0, maxFieldLength) + '... (e mais)';
                }
                const rolesList = rolesContent || 'Nenhum cargo salvo.';

                let channelsContent = '';
                const allChannels = selectedBackup.channels;

                // Group channels by category
                const categorizedChannels = new Map();
                const uncategorizedChannels = [];

                for (const channel of allChannels) {
                    if (channel.isCategory) {
                        categorizedChannels.set(channel.id, { ...channel, children: [] });
                    } else if (channel.parentId) {
                        const parentCategory = categorizedChannels.get(channel.parentId);
                        if (parentCategory) {
                            parentCategory.children.push(channel);
                        } else {
                            // Fallback for channels with invalid parentId
                            uncategorizedChannels.push(channel);
                        }
                    } else {
                        uncategorizedChannels.push(channel);
                    }
                }

                // Sort categories by position
                const sortedCategories = Array.from(categorizedChannels.values()).sort((a, b) => a.position - b.position);

                // Add uncategorized channels first
                if (uncategorizedChannels.length > 0) {
                    channelsContent += 'Sem Categoria:\n';
                    uncategorizedChannels.sort((a, b) => a.position - b.position).forEach(c => {
                        const icon = c.type === ChannelType.GuildText ? '# ' : (c.type === ChannelType.GuildVoice ? '🔊 ' : '');
                        channelsContent += `  ${icon}${c.name}\n`;
                    });
                }

                // Add categorized channels
                for (const category of sortedCategories) {
                    channelsContent += `\n${category.name}:\n`;
                    category.children.sort((a, b) => a.position - b.position).forEach(c => {
                        const icon = c.type === ChannelType.GuildText ? '# ' : (c.type === ChannelType.GuildVoice ? '🔊 ' : '');
                        channelsContent += `  ${icon}${c.name}\n`;
                    });
                }

                if (channelsContent.length > maxFieldLength) {
                    channelsContent = channelsContent.substring(0, maxFieldLength) + '... (e mais)';
                }
                const channelsList = channelsContent || 'Nenhum canal salvo.';

                const detailsEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`✨ Detalhes do Backup: ${selectedBackup.backupId}`)
                    .setThumbnail(selectedBackup.server.iconURL)
                    .addFields(
                                { name: '🏷️ Nome do Servidor', value: selectedBackup.server.name, inline: true },
                                { name: '📅 Data de Criação', value: moment(selectedBackup.createdAt).format('DD/MM/YYYY HH:mm:ss'), inline: true },
                            );

                const serverEmbed = new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .addFields(
                                { name: '📺 Canais', value: `\`\`\`\n${channelsList}\n\`\`\``, inline: true },
                                { name: '📜 Cargos', value: `\`\`\`\n${rolesList}\n\`\`\``, inline: true }
                            );

                const otherEmbed = new EmbedBuilder()
                    .setColor('#6c757d')
                    .addFields(
                                { name: '😀 Emojis', value: `\`\`\`${selectedBackup.emojis.length}\`\`\``, inline: true },
                                { name: '🔨 Bans', value: `\`\`\`${selectedBackup.bans.length}\`\`\``, inline: true },
                                { name: '💬 Mensagens Que foram Salvas', value: `\`\`\`${selectedBackup.messages.length}\`\`\``, inline: true }
                            );

                return message.reply({ embeds: [detailsEmbed, serverEmbed, otherEmbed] });
            }

            default:
                return message.reply('Subcomando inválido. Use `enable`, `disable`, `create`, `interval`, `channels`, `list` ou `info`.');
        }
    },
};

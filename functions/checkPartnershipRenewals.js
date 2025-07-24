const Partnership = require('../MongoDB/Models/Partnership');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = async (client) => {
    console.log('🤝 » Verificando renovações de parceria...');
    const partnerships = await Partnership.find({ active: true });

    for (const partnership of partnerships) {
        const now = new Date();
        const expiresAt = new Date(partnership.expiresAt);
        const threeDaysBefore = new Date(expiresAt);
        threeDaysBefore.setDate(expiresAt.getDate() - 3);

        // Check for renewal notification (3 days before expiration)
        if (now >= threeDaysBefore && now < expiresAt && !partnership.notified) {
            try {
                const representative = await client.users.fetch(partnership.representativeId).catch(() => null);
                if (representative) {
                    const renewalEmbed = new EmbedBuilder()
                        .setColor('#FFFF00')
                        .setTitle('🔔 Renovação de Parceria')
                        .setDescription(`Olá ${representative},

Sua parceria com o servidor **${partnership.serverName}** está prestes a expirar em 3 dias! Para renovar, por favor, abra um ticket no servidor.`)
                        .addFields(
                            { name: '🔗 Link do Servidor', value: partnership.serverLink || 'Não disponível' }
                        );

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel('Abrir Ticket')
                                .setEmoji('🎫')
                                .setURL('https://discord.com/channels/1260745982208114779/1340754610528325683') // Replace with actual ticket channel ID or server invite
                                .setStyle(ButtonStyle.Link)
                        );

                    await representative.send({ embeds: [renewalEmbed], components: [row] });
                    partnership.notified = true;
                    await partnership.save();
                }
            } catch (error) {
                console.error(`Erro ao enviar DM de renovação para ${partnership.representativeId}:`, error);
            }
        }

        // Check for expiration
        if (now >= expiresAt) {
            try {
                partnership.active = false;
                await partnership.save();

                const guild = await client.guilds.fetch(partnership.guildId).catch(() => null);
                if (!guild) {
                    console.error(`Servidor ${partnership.guildId} não encontrado para parceria expirada.`);
                    continue;
                }

                const staffMember = await guild.members.fetch(partnership.staffId).catch(() => null);

                // Attempt to delete partnership messages
                const partnershipChannel = await guild.channels.fetch(partnership.partnershipChannelId).catch(() => null);
                if (partnershipChannel) {
                    const partnershipMessage = await partnershipChannel.messages.fetch(partnership.partnershipMessageId).catch(() => null);
                    if (partnershipMessage) await partnershipMessage.delete().catch(() => console.error('Failed to delete expired partnership message.'));

                    const botMessage = await partnershipChannel.messages.fetch(partnership.botMessageId).catch(() => null);
                    if (botMessage) await botMessage.delete().catch(() => console.error('Failed to delete expired bot message.'));
                }

                // Notify staff member
                if (staffMember) {
                    const staffEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Parceria Finalizada')
                        .setDescription(`A parceria com **${partnership.serverName}** foi finalizada por expiração.

Se desejar retornar com a parceria, por favor, abra um ticket.`)
                        .addFields(
                            { name: '🔗 Link do Servidor', value: partnership.serverLink || 'Não disponível' },
                            { name: '📝 Mensagem de Apresentação', value: partnership.presentationMessage ? partnership.presentationMessage.substring(0, 1020) + (partnership.presentationMessage.length > 1020 ? '...' : '') : 'Não disponível' }
                        );
                    staffMember.send({ embeds: [staffEmbed] }).catch(() => console.error('Failed to send DM to staff member about expired partnership.'));
                }

                // Notify representative (if possible)
                const representative = await client.users.fetch(partnership.representativeId).catch(() => null);
                if (representative) {
                    const representativeEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Sua Parceria Foi Finalizada')
                        .setDescription(`Sua parceria com o servidor **${partnership.serverName}** foi finalizada por expiração.

Se desejar retornar com a parceria, por favor, abra um ticket.`)
                        .addFields(
                            { name: '🔗 Link do Servidor', value: partnership.serverLink || 'Não disponível' },
                            { name: '📝 Mensagem de Apresentação', value: partnership.presentationMessage ? partnership.presentationMessage.substring(0, 1020) + (partnership.presentationMessage.length > 1020 ? '...' : '') : 'Não disponível' }
                        );
                    representative.send({ embeds: [representativeEmbed] }).catch(() => console.error('Failed to send DM to representative about expired partnership.'));
                }
            } catch (error) {
                console.error(`Erro ao processar parceria expirada para ${partnership.serverName}:`, error);
            }
        }
    }
};

const { Events, EmbedBuilder } = require('discord.js');
const Partnership = require('../MongoDB/Models/Partnership');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        try {
            const partnership = await Partnership.findOne({ representativeId: member.id, active: true });

            if (partnership) {
                partnership.active = false;
                await partnership.save();

                const guild = member.guild;
                const staffMember = await guild.members.fetch(partnership.staffId).catch(() => null);

                // Attempt to delete partnership messages
                const partnershipChannel = await guild.channels.fetch(partnership.partnershipChannelId).catch(() => null); // Assuming you'll add channel ID to schema
                if (partnershipChannel) {
                    const partnershipMessage = await partnershipChannel.messages.fetch(partnership.partnershipMessageId).catch(() => null);
                    if (partnershipMessage) await partnershipMessage.delete().catch(() => console.error('Failed to delete partnership message.'));

                    const botMessage = await partnershipChannel.messages.fetch(partnership.botMessageId).catch(() => null);
                    if (botMessage) await botMessage.delete().catch(() => console.error('Failed to delete bot message.'));
                }

                // Notify staff member
                if (staffMember) {
                    const staffEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Parceria Cancelada')
                        .setDescription(`A parceria com **${partnership.serverName}** foi cancelada porque o representante (<@${member.id}>) saiu do servidor.`)
                        .addFields(
                            { name: '🔗 Link do Servidor', value: partnership.serverLink || 'Não disponível' },
                            { name: '📝 Mensagem de Apresentação', value: partnership.presentationMessage ? partnership.presentationMessage.substring(0, 1020) + (partnership.presentationMessage.length > 1020 ? '...' : '') : 'Não disponível' }
                        );
                    staffMember.send({ embeds: [staffEmbed] }).catch(() => console.error('Failed to send DM to staff member.'));
                }

                // Notify representative (if possible)
                const representativeUser = await member.client.users.fetch(member.id).catch(() => null);
                if (representativeUser) {
                    const representativeEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Sua Parceria Foi Cancelada')
                        .setDescription(`Sua parceria com o servidor **${guild.name}** foi cancelada porque você saiu do servidor **${guild.name}**.

Se desejar retornar com a parceria, por favor, abra um ticket no servidor.`)
                        .addFields(
                            { name: '🔗 Link do Servidor', value: partnership.serverLink || 'Não disponível' },
                            { name: '📝 Mensagem de Apresentação', value: partnership.presentationMessage ? partnership.presentationMessage.substring(0, 1020) + (partnership.presentationMessage.length > 1020 ? '...' : '') : 'Não disponível' }
                        );
                    representativeUser.send({ embeds: [representativeEmbed] }).catch(() => console.error('Failed to send DM to representative.'));
                }
            }
        } catch (error) {
            console.error(`Erro ao processar guildMemberRemove:`, error);
        }
    },
};
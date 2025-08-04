const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const UserEconomy = require('../MongoDB/Models/UserEconomy');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isButton()) return;



        if (interaction.customId.startsWith('confirm_transfer_')) {
            // Defer the update immediately to acknowledge the interaction within 3 seconds
            await interaction.deferUpdate(); // Acknowledge the interaction

            const originalMessageId = interaction.customId.replace('confirm_transfer_', '');
            const pendingTransfer = client.pendingTransfers.get(originalMessageId);

            if (!pendingTransfer) {
                // Use followUp after deferUpdate for ephemeral messages
                return interaction.followUp({ content: '⚠️ » Ops, essa interação foi perdida. Use o comando novamente!', ephemeral: true });
            }

            const { senderId, receiverId, amount, confirmations, timeoutId } = pendingTransfer;

            if (interaction.user.id !== senderId && interaction.user.id !== receiverId) {
                return interaction.followUp({ content: 'Você não está envolvido nesta transferência.', ephemeral: true });
            }

            if (confirmations.includes(interaction.user.id)) {
                return interaction.followUp({ content: 'Você já confirmou esta transferência.', ephemeral: true });
            }

            confirmations.push(interaction.user.id);

            const newLabel = `Confirmar Transferência (${confirmations.length}/2)`;
            const updatedButton = ButtonBuilder.from(interaction.component)
                .setLabel(newLabel);

            const updatedRow = new ActionRowBuilder().addComponents(updatedButton);

            // Edit the original message after deferring
            await interaction.editReply({ components: [updatedRow] }); // Use editReply after deferUpdate

            // If both users have confirmed
            if (confirmations.length === 2) {
                clearTimeout(timeoutId); // Stop the expiration timer

                let senderEconomy = await UserEconomy.findOne({ userId: senderId });
                let receiverEconomy = await UserEconomy.findOne({ userId: receiverId });

                if (!senderEconomy || senderEconomy.emeralds < amount) {
                    const failedContent = `❌ A transferência falhou: <@${senderId}> não tem esmeraldas suficientes.`;
                    
                    const disabledButton = ButtonBuilder.from(updatedButton)
                        .setDisabled(true)
                        .setLabel('Transferência Falhou')
                        .setStyle(ButtonStyle.Danger);
                    
                    await interaction.editReply({ content: failedContent, components: [new ActionRowBuilder().addComponents(disabledButton)] });
                    client.pendingTransfers.delete(originalMessageId);
                    return;
                }

                senderEconomy.emeralds -= amount;
                if (!receiverEconomy) {
                    receiverEconomy = new UserEconomy({ userId: receiverId, emeralds: amount });
                } else {
                    receiverEconomy.emeralds += amount;
                }

                await senderEconomy.save();
                await receiverEconomy.save();

                const amountFormatted = amount.toLocaleString('pt-BR');
                const successContent = `✅ Transferência de **${amountFormatted}** Esmeraldas de <@${senderId}> para <@${receiverId}> concluída com sucesso!`;

                const disabledButton = ButtonBuilder.from(updatedButton)
                    .setDisabled(true)
                    .setLabel('Transferência Concluída')
                    .setStyle(ButtonStyle.Success);

                await interaction.editReply({ content: successContent, components: [new ActionRowBuilder().addComponents(disabledButton)] });
                client.pendingTransfers.delete(originalMessageId);
            }
        }
    },
};
const UserEconomy = require('../../MongoDB/Models/UserEconomy');
const MentionUser = require('../../Package/MentionUser');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Função auxiliar para converter string com sufixos para número
function parseAmount(amountStr) {
    const lowerStr = amountStr.toLowerCase();
    if (lowerStr.endsWith('kk')) {
        return parseFloat(lowerStr.slice(0, -2)) * 1_000_000; // Milhões
    } else if (lowerStr.endsWith('k')) {
        return parseFloat(lowerStr.slice(0, -1)) * 1_000; // Milhares
    } else if (lowerStr.endsWith('m')) {
        return parseFloat(lowerStr.slice(0, -1)) * 1_000_000; // Milhões
    }
    return parseFloat(lowerStr);
}

module.exports = {
    name: 'pay',
    aliases: ['enviar', 'transferir'],
    description: 'Transfere esmeraldas para outro usuário.',
    async execute(message, args, client) {
        // 1. Validar argumentos
        if (args.length < 2) {
            return message.reply('Uso correto: `m.pay <usuário> <quantidade>`\nExemplos: `m.pay @User 5000`, `m.pay @User 10k`');
        }

        const receiverInput = args[0];
        const amount = parseAmount(args[1]); // Usa a função parseAmount

        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ A quantidade a ser transferida deve ser um número positivo (ex: 100, 1k, 5m).');
        }

        // 2. Resolver o usuário destinatário
        const receiverUser = await MentionUser.getUser(client, receiverInput, message.guild);
        if (!receiverUser) {
            return message.reply('❌ Usuário para transferência não encontrado. Por favor, mencione um usuário válido ou forneça um ID/tag.');
        }

        // 3. Prevenir auto-transferência
        if (receiverUser.id === message.author.id) {
            return message.reply('❌ Você não pode transferir esmeraldas para si mesmo.');
        }

        // 4. Verificar saldo do remetente
        let senderEconomy = await UserEconomy.findOne({ userId: message.author.id });
        if (!senderEconomy || senderEconomy.emeralds < amount) {
            return message.reply(`❌ Você não possui esmeraldas suficientes para esta transferência. Seu saldo atual é de **${senderEconomy ? senderEconomy.emeralds.toLocaleString('pt-BR') : 0}** Esmeraldas.`);
        }

        // 5. Criar mensagem de solicitação de transferência
        const amountFormatted = amount.toLocaleString('pt-BR');
        const expirationTime = Math.floor((Date.now() + (15 * 60 * 1000)) / 1000); // 15 minutos a partir de agora, em segundos
        const transferMessageContent = `💸 **<@${message.author.id}>** deseja transferir **${amountFormatted}** Esmeraldas para **<@${receiverUser.id}>**.\n🤝 Ambos os usuários devem confirmar a transferência clicando no botão abaixo. Esta solicitação expira <t:${expirationTime}:R>.`;

        // Envia a mensagem inicial sem o botão
        const sentMessage = await message.reply({
            content: transferMessageContent,
            fetchReply: true // Necessário para obter o ID da mensagem para o mapa
        });

        // Agora cria o botão usando sentMessage.id
        const confirmButton = new ButtonBuilder()
            .setCustomId(`confirm_transfer_${sentMessage.id}`) // Usa sentMessage.id aqui
            .setLabel('Confirmar Transferência (0/2)')
            .setEmoji('💸')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(confirmButton);

        // Edita a mensagem para adicionar o botão
        await sentMessage.edit({ components: [row] });

        // 6. Armazenar a transferência pendente e iniciar o temporizador
        const timeoutId = setTimeout(async () => {
            const expiredTransfer = client.pendingTransfers.get(sentMessage.id);
            if (expiredTransfer) {
                const expiredContent = `❌ A solicitação de transferência de **${expiredTransfer.amount.toLocaleString('pt-BR')}** Esmeraldas de **${message.author.username}** para **${receiverUser.username}** expirou.`;
                
                const disabledButton = ButtonBuilder.from(confirmButton)
                    .setDisabled(true)
                    .setLabel('Transferência Expirada');

                await sentMessage.edit({ content: expiredContent, components: [new ActionRowBuilder().addComponents(disabledButton)] });
                client.pendingTransfers.delete(sentMessage.id);
            }
        }, 15 * 60 * 1000); // 15 minutos em milissegundos

        client.pendingTransfers.set(sentMessage.id, {
            senderId: message.author.id,
            receiverId: receiverUser.id,
            amount: amount,
            confirmations: [], // Array de IDs de usuários que confirmaram
            timeoutId: timeoutId,
            originalMessageId: message.id // Armazena o ID da mensagem original para vincular a interação
        });
    },
};
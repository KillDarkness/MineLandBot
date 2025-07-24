const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'clear',
    aliases: ['limpar', 'purge'],
    description: 'Limpa um número especificado de mensagens do canal.',
    async execute(message, args) {
        // 1. Verificar permissão do usuário
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('❌ Você não tem permissão para usar este comando. Você precisa da permissão `Gerenciar Mensagens`.');
        }

        // 2. Validar argumentos
        const amount = parseInt(args[0]);

        if (isNaN(amount) || amount <= 0 || amount > 100) {
            return message.reply('❌ Por favor, forneça um número entre 1 e 100 para a quantidade de mensagens a serem apagadas.');
        }

        // 3. Apagar as mensagens
        try {
            const fetched = await message.channel.messages.fetch({ limit: amount + 1 }); // +1 para incluir a mensagem do comando
            await message.channel.bulkDelete(fetched, true); // true para não apagar mensagens com mais de 14 dias

            const replyMessage = await message.channel.send(`🧹 » Foram apagadas **${amount}** mensagens neste chat!`);
            setTimeout(() => replyMessage.delete().catch(() => {}), 5000); // Apaga a mensagem de confirmação após 5 segundos

        } catch (error) {
            console.error('Erro ao apagar mensagens:', error);
            message.reply('❌ Ocorreu um erro ao tentar apagar as mensagens. Verifique se tenho permissão para `Gerenciar Mensagens` neste canal e se as mensagens não são muito antigas (mais de 14 dias).');
        }
    },
};
const UserEconomy = require('../../MongoDB/Models/UserEconomy');
const MentionUser = require('../../Package/MentionUser');
const Permission = require('../../MongoDB/Models/Permissions');

// Função auxiliar para converter string com sufixos para número
function parseAmount(amountStr) {
    const lowerStr = amountStr.toLowerCase();
    if (lowerStr.endsWith('kk')) {
        return parseFloat(lowerStr.slice(0, -2)) * 1_000_000;
    } else if (lowerStr.endsWith('k')) {
        return parseFloat(lowerStr.slice(0, -1)) * 1_000;
    } else if (lowerStr.endsWith('m')) {
        return parseFloat(lowerStr.slice(0, -1)) * 1_000_000;
    }
    return parseFloat(lowerStr);
}

module.exports = {
    name: 'mlec',
    description: 'Gerencia a quantidade de esmeraldas de um usuário (apenas para o grupo master).',
    async execute(message, args, client) {
        // 1. Verificar permissão do usuário
        const staffPermission = await Permission.findOne({ userID: message.author.id });
        if (!staffPermission || !staffPermission.group.includes('master')) {
            return message.reply('❌ Você não tem permissão para usar este comando. Apenas usuários do grupo `master` podem gerenciar esmeraldas.');
        }

        // 2. Validar argumentos
        if (args.length < 3) {
            return message.reply('Uso correto: `m.mlec <usuário> <set/add/remove> <quantidade>`\nExemplos: `m.mlec @User add 100k`, `m.mlec @User set 5m`');
        }

        const targetInput = args[0];
        const action = args[1].toLowerCase();
        const quantity = parseAmount(args[2]); // Usa a função parseAmount

        if (isNaN(quantity) || quantity < 0) {
            return message.reply('❌ A quantidade deve ser um número positivo (ex: 100, 1k, 5m).');
        }

        // 3. Resolver o usuário alvo
        const targetUser = await MentionUser.getUser(client, targetInput, message.guild);
        if (!targetUser) {
            return message.reply('❌ Usuário não encontrado. Por favor, mencione um usuário válido ou forneça um ID/tag.');
        }

        // 4. Buscar ou criar o registro de economia do usuário
        let userEconomy = await UserEconomy.findOne({ userId: targetUser.id });
        if (!userEconomy) {
            userEconomy = new UserEconomy({ userId: targetUser.id, emeralds: 0 });
        }

        const oldEmeralds = userEconomy.emeralds; // Salva o valor antigo para a mensagem

        // 5. Executar a ação
        switch (action) {
            case 'set':
                userEconomy.emeralds = quantity;
                break;
            case 'add':
                userEconomy.emeralds += quantity;
                break;
            case 'remove':
                userEconomy.emeralds -= quantity;
                if (userEconomy.emeralds < 0) userEconomy.emeralds = 0; // Garante que não fique negativo
                break;
            default:
                return message.reply('❌ Ação inválida. Use `set`, `add` ou `remove`.');
        }

        await userEconomy.save();

        const newEmeraldsFormatted = userEconomy.emeralds.toLocaleString('pt-BR');
        const oldEmeraldsFormatted = oldEmeralds.toLocaleString('pt-BR');
        const quantityFormatted = quantity.toLocaleString('pt-BR');

        // 6. Enviar confirmação com mensagem detalhada
        let responseMessage = `✅ Gerenciamento de Esmeraldas para **${targetUser.username}** (ID: ${targetUser.id}):\n`;
        responseMessage += `   • Ação: \`${action.toUpperCase()}\`
`;
        responseMessage += `   • Quantidade: **${quantityFormatted}** Esmeraldas\n`;
        responseMessage += `   • Saldo Anterior: **${oldEmeraldsFormatted}** Esmeraldas\n`;
        responseMessage += `   • Saldo Atual: **${newEmeraldsFormatted}** Esmeraldas`;

        message.reply(responseMessage);
    },
};
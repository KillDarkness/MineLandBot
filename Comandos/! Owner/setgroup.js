const { EmbedBuilder } = require('discord.js');
const Permission = require('../../MongoDB/Models/Permissions.js'); // Importa o modelo de permissão

module.exports = {
    name: 'setgroup',
    description: 'Adiciona ou remove um grupo de um usuário (apenas para o dono do bot)',
    async execute(message, args) {
        // Verifica se o usuário que executou o comando é o dono do bot
        const ownerID = '758347932914155572'; // ID do dono do bot
        if (message.author.id !== ownerID) {
            return message.reply('❌ Você não tem permissão para usar este comando.');
        }

        // Verifica se o comando foi usado corretamente
        const userID = args[0];
        const action = args[1]; // 'add' ou 'remove'
        const group = args[2];

        if (!userID || !action || !group) {
            return message.reply('❌ Uso correto: `m!setgroup <userID> <add/remove> <group>`');
        }

        // Verifica se o grupo é válido
        const validGroups = ['master', 'owner', 'admin', 'premium', 'elite', 'vip'];
        if (!validGroups.includes(group)) {
            return message.reply('❌ Grupo inválido. Grupos permitidos: `master`, `owner`, `admin`, `elite`, `vip`.');
        }

        try {
            // Busca o registro do usuário no banco de dados
            let userPermission = await Permission.findOne({ userID });

            if (!userPermission) {
                // Se o usuário não existir, cria um novo registro
                userPermission = new Permission({ userID, group: [] });
            }

            // Adiciona ou remove o grupo
            if (action === 'add') {
                if (!userPermission.group.includes(group)) {
                    userPermission.group.push(group); // Adiciona o grupo
                } else {
                    return message.reply(`❌ O usuário <@${userID}> já possui o grupo **${group}**.`);
                }
            } else if (action === 'remove') {
                if (userPermission.group.includes(group)) {
                    userPermission.group = userPermission.group.filter(g => g !== group); // Remove o grupo
                } else {
                    return message.reply(`❌ O usuário <@${userID}> não possui o grupo **${group}**.`);
                }
            } else {
                return message.reply('❌ Ação inválida. Use `add` ou `remove`.');
            }

            // Salva as alterações no banco de dados
            await userPermission.save();

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setDescription(`✅ Grupo **${group}** ${action === 'add' ? 'adicionado' : 'removido'} do usuário <@${userID}>.`);

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao definir grupo do usuário:', error);
            message.reply('❌ Ocorreu um erro ao definir o grupo do usuário.');
        }
    },
};
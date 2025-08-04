const { PermissionsBitField } = require('discord.js');
const MentionUser = require('../../Package/MentionUser');

module.exports = {
    name: 'setnick',
    aliases: ['nickname', 'nick'],
    description: 'Altera o apelido de um usuário no servidor.',
    async execute(message, args, client) {
        // Verifica se o autor da mensagem tem permissão para gerenciar apelidos
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
            return message.reply('<:barrier:1397996625062002838> Você não tem permissão para alterar apelidos.');
        }

        // Verifica se o bot tem permissão para gerenciar apelidos
        if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
            return message.reply('<:barrier:1397996625062002838> Eu não tenho permissão para alterar apelidos neste servidor.');
        }

        const user = await MentionUser.getUser(client, args[0], message.guild);

        if (!user) {
            return message.reply('<:structure_void:1397996900023537855> Você precisa mencionar um usuário ou fornecer um ID válido.');
        }

        const member = message.guild.members.cache.get(user.id);

        // Impede que o bot tente alterar o apelido do dono do servidor
        if (member.id === message.guild.ownerId) {
            return message.reply('<:barrier:1397996625062002838> Eu não posso alterar o apelido do dono do servidor.');
        }

        // Verifica se a role do bot é alta o suficiente para alterar o apelido do membro
        if (member.roles.highest.position >= message.guild.members.me.roles.highest.position) {
            return message.reply('<:structure_void:1397996900023537855> Eu não posso alterar o apelido de um membro com cargo igual ou superior ao meu.');
        }

        const newNickname = args.slice(1).join(' ');

        if (!newNickname) {
            return message.reply('<:structure_void:1397996900023537855> Você precisa fornecer um novo apelido.');
        }

        if (newNickname.length > 32) {
            return message.reply('<:barrier:1397996625062002838> O apelido não pode ter mais de 32 caracteres.');
        }

        try {
            await member.setNickname(newNickname);
            message.channel.send(`<:name_tag:1397996817098080467> O apelido de **${member.user.username}** foi alterado para **${newNickname}**.`);
        } catch (error) {
            console.error('Erro ao tentar alterar o apelido:', error);
            message.reply('<:barrier:1397996625062002838> Ocorreu um erro ao tentar alterar o apelido deste usuário.');
        }
    },
};

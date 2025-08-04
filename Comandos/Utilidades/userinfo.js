const { EmbedBuilder } = require('discord.js');
const MentionUser = require('../../Package/MentionUser'); 

module.exports = {
    name: 'userinfo',
    description: '📋 » Mostra informações sobre um usuário.',
    aliases: ['ui', 'user'],
    async execute(message, args) {
        const input = args[0] || message.author.id; 
        const user = await MentionUser.getUser(message.client, input, message.guild);

        if (!user) {
            return message.reply('🛑 » Usuário não encontrado.');
        }

        const member = message.guild.members.cache.get(user.id);

        if (!member) {
            return message.reply('🛑 » Usuário não está no servidor.');
        }

        // Embed 1: Informações gerais do usuário
        const embed1 = new EmbedBuilder()
            .setColor('#2b2d31')
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
            .setThumbnail(user.displayAvatarURL({ size: 1024 }))
            .addFields(
                { name: '🆔 » ID', value: user.id, inline: true },
                { name: '🏷️ » Tag', value: user.tag, inline: true },
                { name: '📛 » Nickname global', value: user.username, inline: true },
                { name: '📅 » Conta criada em', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: true },
                { name: '⏳ » Duração', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true }
            );

        // Embed 2: Informações do usuário no servidor
        const highestRole = member.roles.highest;
        const embed2 = new EmbedBuilder()
            .setColor('#2b2d31')
            .setThumbnail(member.displayAvatarURL({ size: 1024 }))
            .addFields(
                { name: '📛 » Nickname no servidor', value: member.nickname || user.username, inline: true },
                { name: '📅 » Entrou no servidor em', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true },
                { name: '⏳ » Duração', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: '🎖️ » Maior cargo', value: highestRole.toString(), inline: true },
                { name: '🎭 » Quantidade de cargos', value: member.roles.cache.size.toString(), inline: true }
            )
            .setFooter({ text: `Solicitado por ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

        message.reply({ embeds: [embed1, embed2] });
    },
};
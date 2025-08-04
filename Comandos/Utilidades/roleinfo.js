const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'roleinfo',
    description: '📋 » Mostra informações sobre um cargo.',
    aliases: ['ri', 'role'],
    execute(message, args) {
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);

        if (!role) {
            return message.reply('🛑 » Cargo não encontrado.');
        }

        const embed = new EmbedBuilder()
            .setColor(role.hexColor)
            .setAuthor({ name: role.name, iconURL: message.guild.iconURL() })
            .setThumbnail(role.iconURL({ size: 1024 }))
            .addFields(
                { name: '🆔 » ID do cargo', value: role.id, inline: true },
                { name: '🎨 » Cor', value: role.hexColor, inline: true },
                { name: '📅 » Criado em', value: `<t:${Math.floor(role.createdTimestamp / 1000)}:F>`, inline: true },
                { name: '👥 » Membros com este cargo', value: role.members.size.toString(), inline: true }
            )
            .setFooter({ text: `Solicitado por ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

        message.reply({ embeds: [embed] });
    },
};
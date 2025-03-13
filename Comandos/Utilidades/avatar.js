const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'avatar',
    description: '🖼️ » Mostra o avatar de um usuário.',
    aliases: ['av', 'pfp'],
    execute(message, args) {
        const user = message.mentions.users.first() || message.author;
        const avatarURL = user.displayAvatarURL({ size: 1024, dynamic: true });

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
            .setImage(avatarURL)
            .setFooter({ text: `Solicitado por ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Abrir avatar')
                .setURL(avatarURL)
                .setStyle(ButtonStyle.Link)
        );

        message.reply({ embeds: [embed], components: [button] });
    },
};
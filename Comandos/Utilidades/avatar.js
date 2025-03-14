const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const MentionUser = require('../../Package/MentionUser');

module.exports = {
    name: 'avatar',
    description: '🖼️ » Mostra o avatar de um usuário.',
    aliases: ['av', 'pfp'],
    async execute(message, args) {
        const input = args[0] || message.author.id; // Usa o autor da mensagem se não houver argumentos
        const user = await MentionUser.getUser(message.client, input, message.guild);

        if (!user) {
            return message.reply('🛑 » Usuário não encontrado.');
        }

        const member = message.guild.members.cache.get(user.id);

        if (!member) {
            return message.reply('🛑 » Usuário não está no servidor.');
        }

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
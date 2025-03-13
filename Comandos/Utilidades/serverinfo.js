const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'serverinfo',
    description: '📋 » Mostra informações sobre o servidor.',
    aliases: ['si', 'server'],
    async execute(message) {
        const guild = message.guild;
        const owner = await guild.fetchOwner(); // Busca o dono do servidor

        const textChannels = guild.channels.cache.filter(ch => ch.isTextBased()).size;
        const voiceChannels = guild.channels.cache.filter(ch => ch.isVoiceBased()).size;

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setAuthor({ name: guild.name, iconURL: guild.iconURL() })
            .setThumbnail(guild.iconURL({ size: 1024 }))
            .addFields(
                { name: '🆔 » ID do servidor', value: guild.id, inline: true },
                { name: '👑 » Dono', value: `\`${owner.user.tag}\` (\`${owner.id}\`)`, inline: true },
                { name: '📅 » Criado em', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F> (<t:${Math.floor(guild.createdTimestamp / 1000)}:R>)`, inline: true },
                { name: '👥 » Membros', value: guild.memberCount.toString(), inline: true },
                { name: '📁 » Canais', value: `🧾 Texto: ${textChannels}\n📞 Voz: ${voiceChannels}`, inline: true },
                { name: '🎭 » Cargos', value: guild.roles.cache.size.toString(), inline: true }
            )
            .setFooter({ text: `Solicitado por ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

        message.reply({ embeds: [embed] });
    },
};
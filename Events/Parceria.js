const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Check if the message is in the specified channel
    const partnershipChannelId = '1351965879499358229';
    if (message.channel.id !== partnershipChannelId) return;
    
    // Regular expression to detect Discord invite links
    const discordInviteRegex = /(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9]+/g;
    const inviteLink = message.content.match(discordInviteRegex);
    
    if (!inviteLink) return;
    
    // Extract the first found invite link
    const serverLink = inviteLink[0].startsWith('http') ? inviteLink[0] : `https://${inviteLink[0]}`;
    
    // Check if someone was mentioned as a partner representative
    const mentionedUser = message.mentions.users.first();
    
    // Create the embed
    const partnershipEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🌟 Parceria Registrada!')
      .setDescription('Obrigado! Agora possuímos mais um parceiro para nosso servidor!')
      .setImage('https://images-ext-1.discordapp.net/external/hmFwoquc2KsrDaUq0TvOEXziXt5jHMa5TPff0mJLCo0/https/i.pinimg.com/originals/97/2e/19/972e1952296657e5fd01faa98812aece.gif?width=533&height=225')
      .addFields(
        { name: '📨 Link de Convite', value: `[Clique aqui para entrar no servidor](${serverLink})`, inline: true },
        { name: '📝 Autor da Parceria', value: `${message.author}`, inline: true }
      );
    
    // Add the representative field if someone was mentioned
    if (mentionedUser) {
      partnershipEmbed.addFields(
        { name: '🤝 Representante da Parceria', value: `${mentionedUser}`, inline: true }
      );
    }
    
    // Create the buttons for the reply message
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Ir para a mensagem')
          .setEmoji('🧭')
          .setURL(message.url)
          .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
          .setLabel('Entrar no servidor')
          .setEmoji('🎲')
          .setURL(serverLink)
          .setStyle(ButtonStyle.Link)
      );
    
    // Send the embed with buttons
    await message.reply({
      embeds: [partnershipEmbed],
      components: [row]
    });

    // Send a DM to the mentioned representative if there is one
    if (mentionedUser) {
      try {
        // Fetch the guild information using the invite link
        const invite = await message.client.fetchInvite(serverLink);
        const guild = invite.guild;
        const memberCount = guild.memberCount;

        let renewalMessage;
        if (memberCount < 1000) {
          renewalMessage = 'A renovação da matrícula deve ser feita a cada 3 semanas. O servidor deve seguir os termos do Discord.';
        } else {
          renewalMessage = 'A renovação da matrícula deve ser feita a cada 2 semanas. O servidor deve ter um cargo de ping ou everyone, e ter uma comunidade ativa.';
        }

        // Create the embed for the DM
        const dmEmbed = new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('🌟 Informações de Parceria')
          .setDescription(`Olá ${mentionedUser}, você foi mencionado como representante de uma parceria no servidor **${guild.name}**.`)
          .addFields(
            { name: '📋 Termos de Renovação', value: renewalMessage }
          );

        // Create the buttons for the DM
        const dmButtons = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setLabel('Ir para o servidor')
              .setEmoji('🎲')
              .setURL(serverLink)
              .setStyle(ButtonStyle.Link),
            new ButtonBuilder()
              .setLabel('Ir para a mensagem')
              .setEmoji('🧭')
              .setURL(message.url)
              .setStyle(ButtonStyle.Link)
          );

        // Send the DM with the embed and buttons
        await mentionedUser.send({
          embeds: [dmEmbed],
          components: [dmButtons]
        });
      } catch (error) {
        console.error(`Não foi possível enviar a mensagem direta para ${mentionedUser.tag}:`, error);
        return;
      }
    }
  },
};
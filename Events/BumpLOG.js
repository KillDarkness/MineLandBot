const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Verifica se a mensagem é do bot Fibo
    if (message.author.id !== '735147814878969968') return;

    // Verifica se é uma mensagem do Fibo sobre bump bem-sucedido
    if (message.content.includes('**Obrigado** por dar o Bump! Volte em **2 Horas**.')) {
      return handleFiboBump(message);
    }
  },
};

async function handleFiboBump(message) {
  // Extrai o ID do usuário mencionado na mensagem do Fibo
  const userMention = message.mentions.users.first();
  const userId = userMention?.id;
  const bumpUser = userId ? message.client.users.cache.get(userId) : null;
  
  // Canal de logs (substitua pelo ID do seu canal)
  const logChannelId = '1341859529608003604';
  const logChannel = message.client.channels.cache.get(logChannelId);
  
  if (!logChannel) return console.error('Canal de logs não encontrado!');

  // Cria o embed de log
  const logEmbed = new EmbedBuilder()
    .setColor('#00FF00') // Verde
    .setTitle('📊 Log de Bump - Fibo')
    .setDescription(`Um bump foi realizado no servidor ${message.guild?.name || 'Servidor Desconhecido'}`)
    .addFields(
      { name: '👤 Usuário', value: bumpUser ? `<@${bumpUser.id}> (\`${bumpUser.id}\`)` : 'Não identificado', inline: true },
      { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
      { name: '⏱️ Próximo Bump', value: `<t:${Math.floor(Date.now() / 1000) + 7200}:R>`, inline: true }
    )
    .setFooter({ text: 'Sistema de Logs de Bump', iconURL: message.guild?.iconURL() })
    .setTimestamp();

  // Cria botão para ir para a mensagem
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel('Ir para a mensagem')
        .setEmoji('🔗')
        .setURL(message.url)
        .setStyle(ButtonStyle.Link) // Esta linha é crucial
    );

  // Envia o log
  await logChannel.send({
    embeds: [logEmbed],
    components: [row]
  });
}
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'embedappeal',
    description: '📋 » Cria um embed interativo para solicitação de revisão de punição.',
    async execute(message, args) {
        try {
            // Verifica se o usuário tem permissão (moderador/admin)
            if (!message.member.permissions.has('ManageMessages')) {
                return message.reply({
                    content: '🛑 » Você não tem permissão para usar este comando.',
                    flags: 'Ephemeral'
                });
            }

            // Cria a embed de appeal aprimorada
            const appealEmbed = new EmbedBuilder()
                .setColor('#1E90FF')
                .setTitle('📜 Sistema de Revisão de Punições')
                .setDescription('**Acredita que foi punido injustamente ou deseja uma segunda chance?**\n\nUtilize o botão abaixo para abrir o formulário de appeal. Nossa equipe de moderação analisará seu caso com atenção e imparcialidade.')
                .addFields(
                    {
                        name: '📝 O que é um Appeal?',
                        value: 'Um appeal é uma solicitação formal para revisar uma punição aplicada no servidor. É sua oportunidade de explicar seu lado e demonstrar arrependimento, se aplicável.',
                        inline: false
                    },
                    {
                        name: '🔔 Como Funciona?',
                        value: '1. Clique no botão "Solicitar Appeal"\n2. Preencha o formulário com respostas honestas\n3. Aguarde até 48 horas para uma resposta\n4. Você será notificado sobre a decisão',
                        inline: true
                    },
                    {
                        name: '⚠️ Regras e Orientações',
                        value: '• Seja respeitoso e honesto\n• Forneça detalhes claros e concisos\n• Appeals falsos ou abusivos podem agravar sua punição\n• Apenas um appeal por usuário a cada 48 horas',
                        inline: true
                    },
                    {
                        name: '⏰ Tempo de Resposta',
                        value: 'Nossa equipe responderá em até **48 horas**. Você receberá uma notificação via DM com a decisão.',
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({
                    text: `${message.guild.name} • Sistema de Appeals`,
                    iconURL: message.guild.iconURL()
                });

            // Cria o botão de appeal
            const appealButton = new ButtonBuilder()
                .setCustomId('appeal_request')
                .setLabel('📋 Solicitar Appeal')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📝');

            const row = new ActionRowBuilder()
                .addComponents(appealButton);

            // Envia a embed com o botão
            await message.channel.send({
                embeds: [appealEmbed],
                components: [row]
            });

            // Deleta a mensagem do comando se possível
            if (message.deletable) {
                await message.delete();
            }

        } catch (error) {
            console.error('Erro no comando embedappeal:', error);
            await message.reply({
                content: '❌ » Ocorreu um erro ao criar a embed de appeal.',
                flags: 'Ephemeral'
            });
        }
    }
};
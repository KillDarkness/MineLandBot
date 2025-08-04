const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const UserMessages = require('../../MongoDB/Models/UserMessages');
const MentionUser = require('../../Package/MentionUser');

module.exports = {
    name: 'syncmessages',
    description: '📊 » Sincroniza as mensagens dos últimos 30 dias e organiza por período',
    aliases: ['syncmsg', 'sincronizar'],
    category: 'Moderação',
    permissions: ['ManageMessages'],
    
    async execute(message, args) {
        // Verifica permissões
        if (!message.member.permissions.has('ManageMessages')) {
            return message.reply('🛑 » Você precisa ter permissão para gerenciar mensagens para usar este comando.');
        }

        // Verifica se já está sincronizando
        if (this.syncing) {
            return message.reply('🔄 » A sincronização já está em andamento. Por favor aguarde.');
        }

        this.syncing = true;

        try {
            const processingMsg = await message.reply('🔍 » Iniciando sincronização das mensagens dos últimos 30 dias...');

            const guild = message.guild;
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Coleta todos os canais de texto do servidor
            const textChannels = guild.channels.cache.filter(ch => ch.isTextBased() && !ch.isThread());

            let totalMessages = 0;
            const userStats = new Map();

            // Atualiza mensagem de progresso
            const progressEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🔄 Sincronização em Progresso')
                .setDescription('Analisando mensagens históricas...')
                .addFields(
                    { name: '📂 Canais processados', value: `0/${textChannels.size}`, inline: true },
                    { name: '✉️ Mensagens encontradas', value: '0', inline: true }
                );

            await processingMsg.edit({ embeds: [progressEmbed] });

            // Processa cada canal
            let processedChannels = 0;
            for (const channel of textChannels.values()) {
                try {
                    let messages;
                    let lastId;
                    
                    // Busca mensagens em lotes de 100
                    do {
                        const options = { limit: 100 };
                        if (lastId) options.before = lastId;

                        messages = await channel.messages.fetch(options);
                        messages = messages.filter(m => m.createdAt >= thirtyDaysAgo && !m.author.bot);

                        // Processa cada mensagem
                        messages.forEach(msg => {
                            const userId = msg.author.id;
                            const currentStats = userStats.get(userId) || {
                                daily: 0,
                                weekly: 0,
                                monthly: 0,
                                total: 0,
                                user: msg.author
                            };

                            currentStats.total++;
                            currentStats.monthly++;
                            
                            // Verifica se a mensagem foi na última semana
                            if (msg.createdAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
                                currentStats.weekly++;
                            }
                            
                            // Verifica se a mensagem foi hoje
                            if (msg.createdAt.toDateString() === new Date().toDateString()) {
                                currentStats.daily++;
                            }

                            userStats.set(userId, currentStats);
                            totalMessages++;
                        });

                        // Atualiza progresso a cada 1000 mensagens
                        if (totalMessages % 1000 === 0) {
                            progressEmbed.spliceFields(0, 2).addFields(
                                { name: '📂 Canais processados', value: `${processedChannels}/${textChannels.size}`, inline: true },
                                { name: '✉️ Mensagens encontradas', value: totalMessages.toString(), inline: true }
                            );
                            await processingMsg.edit({ embeds: [progressEmbed] });
                        }

                        lastId = messages.last()?.id;
                    } while (messages.size === 100 && messages.last()?.createdAt >= thirtyDaysAgo);

                    processedChannels++;
                } catch (error) {
                    console.error(`Erro ao processar canal ${channel.name}:`, error);
                }
            }

            // Salva no banco de dados
            let savedUsers = 0;
            const totalUsers = userStats.size;
            
            progressEmbed
                .setTitle('💾 Salvando no Banco de Dados')
                .setDescription('Atualizando estatísticas dos usuários...')
                .spliceFields(0, 2)
                .addFields(
                    { name: '👤 Usuários processados', value: `0/${totalUsers}`, inline: true },
                    { name: '✉️ Mensagens totais', value: totalMessages.toString(), inline: true }
                );

            await processingMsg.edit({ embeds: [progressEmbed] });

            for (const [userId, stats] of userStats) {
                try {
                    await UserMessages.findOneAndUpdate(
                        { userId, guildId: guild.id },
                        {
                            $inc: {
                                'messages.daily': stats.daily,
                                'messages.weekly': stats.weekly,
                                'messages.monthly': stats.monthly,
                                'messages.total': stats.total
                            },
                            $set: {
                                username: stats.user.username,
                                discriminator: stats.user.discriminator,
                                avatar: stats.user.displayAvatarURL({ dynamic: true }),
                                lastMessageDate: new Date()
                            },
                            $push: {
                                messageHistory: {
                                    $each: Array(stats.total).fill({
                                        date: new Date(),
                                        count: 1
                                    }),
                                    $slice: -500 // Mantém apenas as 500 últimas entradas
                                }
                            }
                        },
                        { upsert: true, new: true }
                    );

                    savedUsers++;
                    
                    // Atualiza progresso a cada 50 usuários
                    if (savedUsers % 50 === 0) {
                        progressEmbed.spliceFields(0, 2).addFields(
                            { name: '👤 Usuários processados', value: `${savedUsers}/${totalUsers}`, inline: true },
                            { name: '✉️ Mensagens totais', value: totalMessages.toString(), inline: true }
                        );
                        await processingMsg.edit({ embeds: [progressEmbed] });
                    }
                } catch (error) {
                    console.error(`Erro ao salvar estatísticas do usuário ${userId}:`, error);
                }
            }

            // Mensagem final
            const resultEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Sincronização Completa')
                .setDescription(`Foram processadas mensagens dos últimos 30 dias em ${textChannels.size} canais.`)
                .addFields(
                    { name: '👤 Usuários atualizados', value: savedUsers.toString(), inline: true },
                    { name: '✉️ Mensagens processadas', value: totalMessages.toString(), inline: true },
                    { name: '📅 Período', value: 'Últimos 30 dias', inline: true }
                )
                .setFooter({ text: `Solicitado por ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

            const buttonRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Ver Estatísticas')
                    .setStyle(ButtonStyle.Primary)
                    .setCustomId('view_stats')
            );

            await processingMsg.edit({ 
                embeds: [resultEmbed],
                components: [buttonRow] 
            });

        } catch (error) {
            console.error('Erro na sincronização:', error);
            message.reply('❌ » Ocorreu um erro durante a sincronização. Verifique os logs.');
        } finally {
            this.syncing = false;
        }
    },
};
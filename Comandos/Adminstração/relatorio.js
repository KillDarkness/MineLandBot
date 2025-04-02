const { EmbedBuilder } = require('discord.js');
const moment = require('moment');
const UserMessages = require('../../MongoDB/Models/UserMessages');
const VoiceTime = require('../../MongoDB/Models/VoiceTime');
const Punishment = require('../../MongoDB/Models/Punishment'); // Importe seu modelo de punições

module.exports = {
    name: 'relatorio',
    aliases: ['relatorio-semanal'],
    description: '📊 » Gera relatório semanal dos staff members (apenas administradores)',
    async execute(message) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply({ content: '🚫 » Apenas administradores podem usar este comando.' });
        }

        const staffRole = message.guild.roles.cache.get('1340754437970329703');
        if (!staffRole) return message.reply({ content: '❌ » Cargo de staff não encontrado.' });

        const staffMembers = staffRole.members;
        if (staffMembers.size === 0) return message.reply({ content: 'ℹ️ » Nenhum staff member encontrado.' });

        const processingMsg = await message.reply({ content: '🔍 » Gerando relatório semanal...' });

        try {
            const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
            const staffData = [];

            // Processar cada staff member
            for (const [id, member] of staffMembers) {
                // Buscar dados de mensagens
                const messagesData = await UserMessages.findOne({
                    userId: member.id,
                    guildId: message.guild.id
                });

                // Buscar dados de tempo em call
                const voiceData = await VoiceTime.findOne({
                    userId: member.id,
                    guildId: message.guild.id
                });

                // Buscar punições aplicadas por este staff nos últimos 7 dias
                const punishments = await Punishment.find({
                    guildID: message.guild.id,
                    staffID: member.id,
                    date: { $gte: sevenDaysAgo }
                });

                // Contar tipos de punições
                const warnings = punishments.filter(p => p.punishType === 'warn').length;
                const mutes = punishments.filter(p => p.punishType === 'mute' || p.punishType === 'timeout').length;
                const bans = punishments.filter(p => p.punishType === 'ban').length;

                // Filtrar sessões dos últimos 7 dias
                const recentSessions = voiceData?.sessions?.filter(session => 
                    new Date(session.joinTime) >= sevenDaysAgo
                ) || [];

                // Calcular tempo total em call (em segundos)
                const callTimeSeconds = recentSessions.reduce((total, session) => {
                    return total + (session.duration || 0);
                }, 0);

                // Formatar tempo em HH:MM:SS
                const callTimeFormatted = formatTime(callTimeSeconds);

                // Contar bumps
                const bumpsCount = messagesData?.messageHistory?.reduce((total, msg) => {
                    if (new Date(msg.date) >= sevenDaysAgo) {
                        const isBump = /(\/bump|!d bump|!bump)/i.test(msg.content || '');
                        return total + (isBump ? 1 : 0);
                    }
                    return total;
                }, 0) || 0;

                // Contar mensagens dos últimos 7 dias
                const messagesCount = messagesData?.messageHistory?.reduce((total, msg) => {
                    return total + (new Date(msg.date) >= sevenDaysAgo ? 1 : 0);
                }, 0) || 0;

                staffData.push({
                    member,
                    messages: messagesCount,
                    bumps: bumpsCount,
                    callTime: callTimeFormatted,
                    callTimeSeconds,
                    warnings,
                    mutes,
                    bans,
                    reports: 0,  // Pode ser integrado com seu sistema de reports
                    tickets: 0,  // Pode ser integrado com seu sistema de tickets
                    score: calculateScore(messagesCount, bumpsCount, callTimeSeconds, warnings, mutes, bans)
                });
            }

            // Ordenar por score
            staffData.sort((a, b) => b.score - a.score);

            // Embeds individuais
            const staffEmbeds = staffData.map((data, index) => {
                return new EmbedBuilder()
                    .setColor(getRankColor(index + 1))
                    .setAuthor({
                        name: `${getRankEmoji(index + 1)} ${data.member.user.tag}`,
                        iconURL: data.member.user.displayAvatarURL()
                    })
                    .setThumbnail(data.member.user.displayAvatarURL())
                    .addFields(
                        { name: '📝 Mensagens', value: `${data.messages}`, inline: true },
                        { name: '🎙 Tempo Call', value: data.callTime, inline: true },
                        { 
                            name: '🔨 Punições', 
                            value: `⚠️ ${data.warnings} | 🔇 ${data.mutes} | 🔨 ${data.bans}`,
                            inline: true 
                        },
                        { name: '🔄 Bumps', value: `${data.bumps}`, inline: true },
                        { name: '🚨 Reports', value: `${data.reports}`, inline: true },
                        { name: '🎫 Tickets', value: `${data.tickets}`, inline: true },
                        { 
                            name: '📅 Período', 
                            value: `${moment(sevenDaysAgo).format('DD/MM/YYYY')} - ${moment().format('DD/MM/YYYY')}`,
                            inline: false 
                        }
                    )
                    .setFooter({
                        text: `🏆 Score: ${data.score} | Posição: ${index + 1}º`,
                        iconURL: message.guild.iconURL()
                    });
            });

            // Dividir em chunks de 5 embeds por mensagem
            const chunkSize = 5;
            for (let i = 0; i < staffEmbeds.length; i += chunkSize) {
                const chunk = staffEmbeds.slice(i, i + chunkSize);
                await message.channel.send({ embeds: chunk });
            }

            await processingMsg.edit({ content: '✅ » Relatório semanal gerado com sucesso!' });

        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            await processingMsg.edit({ content: '❌ » Ocorreu um erro ao gerar o relatório.' });
        }
    },
};

// Função para calcular score com base em várias métricas
function calculateScore(messages, bumps, callTimeSeconds, warnings, mutes, bans) {
    // Pontuação baseada em atividades positivas
    const positiveScore = messages * 2 + bumps * 3 + Math.floor(callTimeSeconds / 3600) * 5;
    
    // Penalização baseada em punições (quanto mais punições, menor o score)
    const punishmentPenalty = warnings * 1 + mutes * 2 + bans * 5;
    
    // Score final (garantindo que não seja negativo)
    return Math.max(0, positiveScore - punishmentPenalty);
}

// Função para formatar tempo em HH:MM:SS
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
}

// Funções auxiliares para ranking
function getRankEmoji(position) {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `${position}º`;
}

function getRankColor(position) {
    if (position === 1) return '#FFD700';
    if (position === 2) return '#C0C0C0';
    if (position === 3) return '#CD7F32';
    return '#2b2d31';
}
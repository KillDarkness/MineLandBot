const config = require('../config');
const Punishment = require('../MongoDB/Models/Punishment');
const Moderation = require('../Package/Moderation');

/**
 * Verifica e gerencia mutes ativos quando o bot reinicia
 * Garante que os tempos de mute continuem sendo respeitados
 * @param {Client} client - Instância do cliente Discord
 */
async function checkActiveMutes(client) {
    try {
        console.log('🔍 » Verificando mutes ativos...');
        
        // Busca todos os mutes ativos com data de expiração
        const activeMutes = await Punishment.find({
            punishType: { $in: ['mute', 'timeout'] },
            active: true,
            expires: { $ne: null }
        });

        if (activeMutes.length === 0) {
            return;
        }

        console.log(`📋 » Encontrados ${activeMutes.length} mutes ativos para verificar.`);

        const now = new Date();
        let processedCount = 0;
        let expiredCount = 0;
        let scheduledCount = 0;

        for (const punishment of activeMutes) {
            try {
                // Busca o servidor e membro
                const guild = client.guilds.cache.get(punishment.guildID);
                if (!guild) {
                    console.log(`⚠️ » Servidor ${punishment.guildID} não encontrado para o caso ${punishment.caseID}`);
                    continue;
                }

                const member = guild.members.cache.get(punishment.targetID);
                if (!member) {
                    console.log(`⚠️ » Membro ${punishment.targetID} não encontrado no servidor ${guild.name} para o caso ${punishment.caseID}`);
                    // Marca como inativo se o membro não existe mais
                    await Punishment.findByIdAndUpdate(punishment._id, {
                        active: false,
                        removeDate: now,
                        removeReason: 'Membro não encontrado no servidor'
                    });
                    continue;
                }

                // Verifica se o mute já expirou
                if (punishment.expires <= now) {
                    console.log(`⏰ » Mute expirado para ${member.user.tag} no servidor ${guild.name}`);
                    
                    // Remove o mute expirado
                    await removeExpiredMute(guild, member, punishment);
                    expiredCount++;
                } else {
                    // Agenda a remoção automática para o tempo restante
                    const timeLeft = punishment.expires.getTime() - now.getTime();
                    console.log(`⏳ » Agendando remoção automática para ${member.user.tag} em ${Math.round(timeLeft / 1000)}s`);
                    
                    scheduleAutoUnmute(guild, member, punishment, timeLeft);
                    scheduledCount++;
                }

                processedCount++;
            } catch (error) {
                console.error(`❌ » Erro ao processar mute do caso ${punishment.caseID}:`, error);
            }
        }

    } catch (error) {
        console.error('❌ » Erro ao verificar mutes ativos:', error);
    }
}

/**
 * Remove um mute expirado e restaura os cargos salvos
 * @param {Guild} guild - Servidor Discord
 * @param {GuildMember} member - Membro que será desmutado
 * @param {Object} punishment - Objeto da punição
 */
async function removeExpiredMute(guild, member, punishment) {
    try {
        let muteRemoved = false;
        
        // Verifica e remove cargo de mute
        const muteRole = guild.roles.cache.get(config.punishRoles?.mute);
        if (muteRole && member.roles.cache.has(muteRole.id)) {
            await member.roles.remove(muteRole, 'Tempo de mute expirado (verificação automática)');
            muteRemoved = true;
        }

        // Verifica e remove timeout nativo
        if (member.isCommunicationDisabled()) {
            await member.timeout(null, 'Tempo de mute expirado (verificação automática)');
            muteRemoved = true;
        }

        // Restaura os cargos salvos se existirem
        if (punishment.rolesID && punishment.rolesID.length > 0) {
            await Moderation.restoreUserRoles(
                member, 
                punishment.rolesID, 
                'Restauração automática após mute expirado'
            );
        }

        // Atualiza o status no banco de dados
        await Punishment.findByIdAndUpdate(punishment._id, {
            active: false,
            removeDate: new Date(),
            removeReason: 'Tempo de mute expirado (verificação automática)'
        });

        if (muteRemoved) {
            console.log(`✅ » Mute removido automaticamente para ${member.user.tag} no servidor ${guild.name}`);
        }
    } catch (error) {
        console.error(`❌ » Erro ao remover mute expirado para ${member.user.tag}:`, error);
    }
}

/**
 * Agenda a remoção automática de um mute
 * @param {Guild} guild - Servidor Discord
 * @param {GuildMember} member - Membro que será desmutado
 * @param {Object} punishment - Objeto da punição
 * @param {number} timeLeft - Tempo restante em milissegundos
 */
function scheduleAutoUnmute(guild, member, punishment, timeLeft) {
    // Limita o timeout máximo (JavaScript tem limite de ~24.8 dias)
    const maxTimeout = 2147483647; // Máximo valor para setTimeout
    
    if (timeLeft > maxTimeout) {
        // Se o tempo for muito longo, agenda uma nova verificação em 24 horas
        setTimeout(() => {
            checkSpecificMute(guild.client, punishment._id);
        }, 24 * 60 * 60 * 1000); // 24 horas
        return;
    }

    setTimeout(async () => {
        try {
            // Verifica se a punição ainda está ativa antes de remover
            const currentPunishment = await Punishment.findById(punishment._id);
            if (!currentPunishment || !currentPunishment.active) {
                return; // Já foi removida manualmente
            }

            // Busca o membro novamente (pode ter saído e voltado)
            const currentMember = guild.members.cache.get(punishment.targetID);
            if (!currentMember) {
                // Marca como inativo se o membro não existe mais
                await Punishment.findByIdAndUpdate(punishment._id, {
                    active: false,
                    removeDate: new Date(),
                    removeReason: 'Membro não encontrado no servidor'
                });
                return;
            }

            await removeExpiredMute(guild, currentMember, currentPunishment);
        } catch (error) {
            console.error(`❌ » Erro na remoção automática agendada:`, error);
        }
    }, timeLeft);
}

/**
 * Verifica um mute específico (usado para mutes de longa duração)
 * @param {Client} client - Instância do cliente Discord
 * @param {string} punishmentId - ID da punição para verificar
 */
async function checkSpecificMute(client, punishmentId) {
    try {
        const punishment = await Punishment.findById(punishmentId);
        if (!punishment || !punishment.active || !punishment.expires) {
            return;
        }

        const guild = client.guilds.cache.get(punishment.guildID);
        if (!guild) return;

        const member = guild.members.cache.get(punishment.targetID);
        if (!member) {
            await Punishment.findByIdAndUpdate(punishmentId, {
                active: false,
                removeDate: new Date(),
                removeReason: 'Membro não encontrado no servidor'
            });
            return;
        }

        const now = new Date();
        if (punishment.expires <= now) {
            await removeExpiredMute(guild, member, punishment);
        } else {
            // Agenda novamente se ainda não expirou
            const timeLeft = punishment.expires.getTime() - now.getTime();
            scheduleAutoUnmute(guild, member, punishment, timeLeft);
        }
    } catch (error) {
        console.error('❌ » Erro ao verificar mute específico:', error);
    }
}

module.exports = {
    checkActiveMutes,
    scheduleAutoUnmute,
    removeExpiredMute
};
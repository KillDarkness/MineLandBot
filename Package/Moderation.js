const { PermissionsBitField } = require('discord.js');
const config = require('../config');
const Punishment = require('../MongoDB/Models/Punishment');

module.exports = {
    /**
     * Gera um caseID único de 6 caracteres hexadecimais em maiúsculas
     * @returns {Promise<string>} - CaseID único
     */
    async generateCaseID() {
        let caseID;
        let exists;
        
        do {
            // Gera 3 bytes (6 caracteres hex) em maiúsculas
            caseID = require('crypto').randomBytes(3).toString('hex').toUpperCase();
            
            // Verifica se já existe no banco de dados
            exists = await Punishment.findOne({ caseID });
        } while (exists);
        
        return caseID;
    },

    /**
     * Converte uma string de tempo para milissegundos
     * @param {string} timeStr - String de tempo (ex: '10m', '1h', '5d')
     * @returns {number|null} - Tempo em milissegundos ou null se inválido
     */
    parseTime(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') return null;
        
        const regex = /^(\d+)([smhdyMw])$/i;
        const match = timeStr.match(regex);
        
        if (!match) return null;
        
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        
        const multipliers = {
            's': 1000,                    // segundos
            'm': 1000 * 60,               // minutos  
            'h': 1000 * 60 * 60,          // horas
            'd': 1000 * 60 * 60 * 24,     // dias
            'w': 1000 * 60 * 60 * 24 * 7, // semanas
            'M': 1000 * 60 * 60 * 24 * 30, // meses (aproximado)
            'y': 1000 * 60 * 60 * 24 * 365 // anos (aproximado)
        };
        
        return value * (multipliers[unit] || 0);
    },

    /**
     * Coleta os IDs dos cargos do usuário (excluindo @everyone e cargos de punição)
     * @param {GuildMember} member - O membro do servidor
     * @returns {string[]} - Array com IDs dos cargos
     */
    getUserRoles(member) {
        const punishRoles = Object.values(config.punishRoles || {});
        
        return member.roles.cache
            .filter(role => role.id !== member.guild.id && !punishRoles.includes(role.id)) // Exclui @everyone e cargos de punição
            .map(role => role.id);
    },

    /**
     * Remove todos os cargos do usuário (exceto @everyone)
     * @param {GuildMember} member - O membro do servidor
     * @param {string} reason - Motivo da remoção
     * @returns {Promise<string[]>} - Array com IDs dos cargos removidos
     */
    async removeAllRoles(member, reason) {
        const currentRoles = this.getUserRoles(member);
        
        if (currentRoles.length > 0) {
            try {
                await member.roles.set([], reason);
            } catch (error) {
                console.error('Erro ao remover cargos:', error);
            }
        }
        
        return currentRoles;
    },

    /**
     * Restaura os cargos salvos do usuário
     * @param {GuildMember} member - O membro do servidor
     * @param {string[]} roleIds - Array com IDs dos cargos para restaurar
     * @param {string} reason - Motivo da restauração
     * @returns {Promise<boolean>} - Se conseguiu restaurar os cargos
     */
    async restoreUserRoles(member, roleIds, reason) {
        if (!roleIds || roleIds.length === 0) return false;
        
        try {
            const rolesToAdd = roleIds
                .map(roleId => member.guild.roles.cache.get(roleId))
                .filter(role => role); // Remove cargos que não existem mais
            
            if (rolesToAdd.length > 0) {
                await member.roles.add(rolesToAdd, reason);
                return true;
            }
        } catch (error) {
            console.error('Erro ao restaurar cargos:', error);
        }
        
        return false;
    },

    /**
     * Verifica se o executor pode punir o alvo
     * @param {GuildMember} executor - Quem está executando o comando
     * @param {GuildMember} target - O usuário alvo da punição
     * @returns {boolean} - Se pode punir ou não
     */
    canPunish(executor, target) {
        // Não pode punir a si mesmo
        if (executor.id === target.id) return false;
        
        // Não pode punir alguém com cargo superior ou igual
        if (target.roles.highest.position >= executor.roles.highest.position) return false;
        
        // Não pode punir o dono do servidor (a menos que seja outro dono)
        if (target.id === target.guild.ownerId && executor.id !== target.guild.ownerId) return false;
        
        return true;
    },

    /**
     * Registra uma punição no banco de dados
     * @param {Object} options - Opções da punição
     * @returns {Promise<Object>} - A punição salva
     */
    async logPunishment(options) {
        const caseID = await this.generateCaseID();
        
        const punishment = new Punishment({
            guildID: options.guildID,
            staffID: options.staffID,
            targetID: options.targetID,
            caseID,
            punishType: options.punishType,
            reason: options.reason,
            date: options.date || new Date(),
            expires: options.expires || null,
            duration: options.duration || null,
            evidence: options.evidence || [],
            active: options.active !== undefined ? options.active : true,
            rolesID: options.rolesID || []
        });
        
        return await punishment.save();
    },

    /**
     * Expulsa um usuário do servidor.
     * @param {GuildMember} executor - Quem está executando o comando.
     * @param {GuildMember} target - O usuário a ser expulso.
     * @param {string} reason - O motivo da expulsão.
     * @returns {Promise<string>} - Mensagem de sucesso ou erro.
     */
    async kick(executor, target, reason = 'Sem motivo fornecido.') {
        if (!executor.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return '🛑 » Você não tem permissão para expulsar membros.';
        }

        if (!this.canPunish(executor, target)) {
            return '🛑 » Você não pode expulsar esse usuário.';
        }

        try {
            // Salva os cargos antes de expulsar
            const userRoles = this.getUserRoles(target);
            
            await target.kick(reason);
            
            // Registra no banco de dados com os cargos salvos
            await this.logPunishment({
                guildID: executor.guild.id,
                staffID: executor.id,
                targetID: target.id,
                punishType: 'kick',
                reason,
                rolesID: userRoles
            });
            
            return `<:MineLand:1378843944263356516> » ${target.user.tag} foi expulso(a) com sucesso.`;
        } catch (error) {
            console.error(error);
            return '🛑 » Ocorreu um erro ao tentar expulsar o usuário.';
        }
    },

    /**
     * Bane um usuário do servidor.
     * @param {GuildMember} executor - Quem está executando o comando.
     * @param {GuildMember} target - O usuário a ser banido.
     * @param {string} reason - O motivo do banimento.
     * @param {number} [days=0] - Número de dias de mensagens para apagar (apenas para ban nativo).
     * @returns {Promise<string>} - Mensagem de sucesso ou erro.
     */
    async ban(executor, target, reason = 'Sem motivo fornecido.', days = 0) {
        if (!executor.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return '🛑 » Você não tem permissão para banir membros.';
        }

        if (!this.canPunish(executor, target)) {
            return '🛑 » Você não pode banir esse usuário.';
        }

        // Salva os cargos antes de aplicar a punição
        const userRoles = this.getUserRoles(target);

        // PRIORIDADE: Tenta aplicar cargo de ban primeiro
        const banRole = executor.guild.roles.cache.get(config.punishRoles.ban);
        if (banRole) {
            try {
                // Remove todos os cargos e adiciona o de ban
                await this.removeAllRoles(target, reason);
                await target.roles.add(banRole, reason);
                
                // Registra no banco de dados com os cargos salvos
                await this.logPunishment({
                    guildID: executor.guild.id,
                    staffID: executor.id,
                    targetID: target.id,
                    punishType: 'ban',
                    reason,
                    active: true,
                    rolesID: userRoles
                });
                
                return `<:MineLand:1378843944263356516> » ${target.user.tag} foi **banido(a)** com sucesso!`;
            } catch (roleError) {
                console.error('Erro ao aplicar cargo de ban:', roleError);
                // Se falhar ao aplicar cargo, continua para o ban nativo
            }
        }

        // FALLBACK: Ban nativo do Discord apenas se o cargo falhar
        try {
            await target.ban({ reason, deleteMessageDays: days });
            
            // Registra no banco de dados com os cargos salvos
            await this.logPunishment({
                guildID: executor.guild.id,
                staffID: executor.id,
                targetID: target.id,
                punishType: 'ban',
                reason,
                active: true,
                rolesID: userRoles
            });
            
            return `<:MineLand:1378843944263356516> » ${target.user.tag} foi **banido(a)** com sucesso!`;
        } catch (error) {
            console.error('Erro ao aplicar ban nativo:', error);
            return '🛑 » Ocorreu um erro ao tentar banir o usuário. Verifique se o cargo de ban existe e se o bot tem as permissões necessárias.';
        }
    },

    /**
     * Silencia um usuário no servidor.
     * @param {GuildMember} executor - Quem está executando o comando.
     * @param {GuildMember} target - O usuário a ser silenciado.
     * @param {string} reason - O motivo do silêncio.
     * @param {string|number} time - Tempo de mute (string como '10m' ou número em milissegundos).
     * @returns {Promise<string>} - Mensagem de sucesso ou erro.
     */
    async mute(executor, target, reason = 'Sem motivo fornecido.', time = null) {
        if (!executor.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return '🛑 » Você não tem permissão para gerenciar cargos.';
        }

        if (!this.canPunish(executor, target)) {
            return '🛑 » Você não pode silenciar esse usuário.';
        }

        // Converte tempo se for string
        let timeMs = null;
        if (time) {
            if (typeof time === 'string') {
                timeMs = this.parseTime(time);
                if (timeMs === null) {
                    return '🛑 » Formato de tempo inválido. Use: 10s, 5m, 2h, 1d, etc.';
                }
            } else if (typeof time === 'number') {
                timeMs = time;
            }
        }

        // Salva os cargos antes de aplicar a punição
        const userRoles = this.getUserRoles(target);

        // PRIORIDADE: Tenta aplicar cargo de mute primeiro
        const muteRole = executor.guild.roles.cache.get(config.punishRoles.mute);
        if (muteRole) {
            try {
                // Remove todos os cargos e adiciona o de mute
                await this.removeAllRoles(target, reason);
                await target.roles.add(muteRole, reason);
                
                // Calcula a data de expiração se houver tempo definido
                const expires = timeMs ? new Date(Date.now() + timeMs) : null;
                const duration = timeMs ? this.formatDuration(timeMs) : null;
                
                // Registra no banco de dados com os cargos salvos
                await this.logPunishment({
                    guildID: executor.guild.id,
                    staffID: executor.id,
                    targetID: target.id,
                    punishType: 'mute',
                    reason,
                    expires,
                    duration,
                    active: true,
                    rolesID: userRoles
                });
                
                // Configura remoção automática se houver tempo definido
                if (timeMs) {
                    setTimeout(async () => {
                        try {
                            // Remove o cargo de mute e restaura os cargos salvos
                            await target.roles.remove(muteRole, 'Tempo de mute expirado.');
                            
                            // Busca a punição para obter os cargos salvos
                            const punishment = await Punishment.findOne({
                                guildID: executor.guild.id,
                                targetID: target.id,
                                active: true,
                                punishType: 'mute'
                            });
                            
                            if (punishment && punishment.rolesID) {
                                await this.restoreUserRoles(target, punishment.rolesID, 'Restauração automática após mute expirado');
                            }
                            
                            // Verifica se tem cargo de membros, se não tiver adiciona
                            const memberRole = executor.guild.roles.cache.get('1340754460695199744');
                            if (memberRole && !target.roles.cache.has(memberRole.id)) {
                                await target.roles.add(memberRole, 'Adicionando cargo de membros após unmute');
                            }
                            
                            // Atualiza no banco de dados
                            await Punishment.findOneAndUpdate(
                                { guildID: executor.guild.id, targetID: target.id, active: true, punishType: 'mute' },
                                { active: false, removeDate: new Date(), removeReason: 'Tempo de mute expirado' }
                            );
                        } catch (removeError) {
                            console.error('Erro ao remover cargo de mute automaticamente:', removeError);
                        }
                    }, timeMs);
                }
                
                return `<:MineLand:1378843944263356516> » ${target.user.tag} foi **silenciado(a)** com sucesso!${duration ? `\n-# Duração: ${duration}` : ''}`;
            } catch (roleError) {
                console.error('Erro ao aplicar cargo de mute:', roleError);
                // Se falhar ao aplicar cargo, continua para o timeout nativo
            }
        }

        // FALLBACK: Timeout nativo do Discord apenas se o cargo falhar
        if (timeMs) {
            try {
                await target.timeout(timeMs, reason);
                
                // Registra no banco de dados com os cargos salvos
                await this.logPunishment({
                    guildID: executor.guild.id,
                    staffID: executor.id,
                    targetID: target.id,
                    punishType: 'timeout',
                    reason,
                    expires: new Date(Date.now() + timeMs),
                    duration: this.formatDuration(timeMs),
                    active: true,
                    rolesID: userRoles
                });
                
                return `<:MineLand:1378843944263356516> » ${target.user.tag} foi **silenciado(a)** com sucesso!\n-# Duração: ${this.formatDuration(timeMs)}`;
            } catch (error) {
                console.error('Erro ao aplicar timeout nativo:', error);
                return '🛑 » Ocorreu um erro ao tentar silenciar o usuário. Verifique se o cargo de mute existe e se o bot tem as permissões necessárias.';
            }
        }

        return '🛑 » Nenhum método de mute disponível foi encontrado. Configure um cargo de mute ou forneça um tempo para usar timeout.';
    },

    /**
     * Formata a duração em um formato legível por extenso
     * @param {number} ms - Duração em milissegundos
     * @returns {string} - Duração formatada
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        const months = Math.floor(days / 30);
        const years = Math.floor(days / 365);

        const parts = [];

        if (years > 0) {
            parts.push(`${years} ${years === 1 ? 'ano' : 'anos'}`);
            const remainingDays = days % 365;
            const remainingMonths = Math.floor(remainingDays / 30);
            if (remainingMonths > 0) {
                parts.push(`${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`);
            }
        } else if (months > 0) {
            parts.push(`${months} ${months === 1 ? 'mês' : 'meses'}`);
            const remainingDays = days % 30;
            if (remainingDays > 0) {
                parts.push(`${remainingDays} ${remainingDays === 1 ? 'dia' : 'dias'}`);
            }
        } else if (days > 0) {
            parts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);
            const remainingHours = hours % 24;
            if (remainingHours > 0) {
                parts.push(`${remainingHours} ${remainingHours === 1 ? 'hora' : 'horas'}`);
            }
        } else if (hours > 0) {
            parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`);
            const remainingMinutes = minutes % 60;
            if (remainingMinutes > 0) {
                parts.push(`${remainingMinutes} ${remainingMinutes === 1 ? 'minuto' : 'minutos'}`);
            }
        } else if (minutes > 0) {
            parts.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`);
            const remainingSeconds = seconds % 60;
            if (remainingSeconds > 0) {
                parts.push(`${remainingSeconds} ${remainingSeconds === 1 ? 'segundo' : 'segundos'}`);
            }
        } else {
            parts.push(`${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`);
        }

        // Retorna até 2 unidades de tempo para não ficar muito longo
        return parts.slice(0, 2).join(' e ');
    },

    /**
     * Remove o silêncio de um usuário no servidor.
     * @param {GuildMember} executor - Quem está executando o comando.
     * @param {GuildMember} target - O usuário a ser desmutado.
     * @param {string} reason - O motivo do desmute.
     * @returns {Promise<string>} - Mensagem de sucesso ou erro.
     */
    async unmute(executor, target, reason = 'Sem motivo fornecido.') {
        if (!executor.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return '🛑 » Você não tem permissão para gerenciar cargos.';
        }

        if (!this.canPunish(executor, target)) {
            return '🛑 » Você não pode desmutar esse usuário.';
        }

        let unmuted = false;
        let punishment = null;

        // Busca a punição ativa para obter os cargos salvos
        punishment = await Punishment.findOne({
            guildID: executor.guild.id,
            targetID: target.id,
            active: true,
            $or: [{ punishType: 'mute' }, { punishType: 'timeout' }]
        });

        // Verifica e remove cargo de mute
        const muteRole = executor.guild.roles.cache.get(config.punishRoles.mute);
        if (muteRole && target.roles.cache.has(muteRole.id)) {
            try {
                await target.roles.remove(muteRole, reason);
                
                // Restaura os cargos salvos se existirem
                if (punishment && punishment.rolesID && punishment.rolesID.length > 0) {
                    await this.restoreUserRoles(target, punishment.rolesID, 'Restauração de cargos após desmute');
                }
                
                // Verifica se tem cargo de membros, se não tiver adiciona
                const memberRole = executor.guild.roles.cache.get('1340754460695199744');
                if (memberRole && !target.roles.cache.has(memberRole.id)) {
                    await target.roles.add(memberRole, 'Adicionando cargo de membros após unmute');
                }
                
                // Atualiza no banco de dados
                await Punishment.findOneAndUpdate(
                    { guildID: executor.guild.id, targetID: target.id, active: true, punishType: 'mute' },
                    { active: false, removedBy: executor.id, removeReason: reason, removeDate: new Date() }
                );
                
                unmuted = true;
            } catch (error) {
                console.error('Erro ao remover cargo de mute:', error);
            }
        }

        // Verifica e remove timeout nativo
        if (target.isCommunicationDisabled()) {
            try {
                await target.timeout(null, reason);
                
                // Restaura os cargos salvos se existirem
                if (punishment && punishment.rolesID && punishment.rolesID.length > 0) {
                    await this.restoreUserRoles(target, punishment.rolesID, 'Restauração de cargos após timeout removido');
                }
                
                // Verifica se tem cargo de membros, se não tiver adiciona
                const memberRole = executor.guild.roles.cache.get('1340754460695199744');
                if (memberRole && !target.roles.cache.has(memberRole.id)) {
                    await target.roles.add(memberRole, 'Adicionando cargo de membros após timeout removido');
                }
                
                // Atualiza no banco de dados
                await Punishment.findOneAndUpdate(
                    { guildID: executor.guild.id, targetID: target.id, active: true, punishType: 'timeout' },
                    { active: false, removedBy: executor.id, removeReason: reason, removeDate: new Date() }
                );
                
                unmuted = true;
            } catch (error) {
                console.error('Erro ao remover timeout:', error);
            }
        }

        if (unmuted) {
            return `<:MineLand:1378843944263356516> » ${target.user.tag} foi desmutado(a) com sucesso.`;
        }

        return '🛑 » O usuário não está mutado ou ocorreu um erro ao tentar desmutá-lo.';
    },

    /**
     * Desbane um usuário do servidor.
     * @param {GuildMember} executor - Quem está executando o comando.
     * @param {User} target - O usuário a ser desbanido.
     * @param {string} reason - O motivo do desbanimento.
     * @returns {Promise<string>} - Mensagem de sucesso ou erro.
     */
    async unban(executor, target, reason = 'Sem motivo fornecido.') {
        if (!executor.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return '🛑 » Você não tem permissão para desbanir membros.';
        }

        let unbanned = false;

        // Verifica se o usuário está no servidor e tem cargo de ban
        const member = executor.guild.members.cache.get(target.id);
        const banRole = executor.guild.roles.cache.get(config.punishRoles.ban);
        
        if (member && banRole && member.roles.cache.has(banRole.id)) {
            try {
                // Remove o cargo de ban
                await member.roles.remove(banRole, reason);
                
                // Adiciona o cargo de membros
                const memberRole = executor.guild.roles.cache.get('1340754460695199744');
                if (memberRole) {
                    await member.roles.add(memberRole, 'Adicionando cargo de membros após unban');
                }
                
                unbanned = true;
            } catch (error) {
                console.error('Erro ao remover cargo de ban:', error);
            }
        }

        // Tenta desban nativo também
        try {
            await executor.guild.members.unban(target, reason);
            unbanned = true;
        } catch (error) {
            // Pode falhar se o usuário não estiver banido nativamente, mas isso é normal
            console.log('Usuário não estava banido nativamente ou erro ao desbanir:', error.message);
        }

        if (unbanned) {
            // Atualiza no banco de dados
            await Punishment.findOneAndUpdate(
                { guildID: executor.guild.id, targetID: target.id, active: true, punishType: 'ban' },
                { active: false, removedBy: executor.id, removeReason: reason, removeDate: new Date() }
            );
            
            return `<:MineLand:1378843944263356516> » ${target.tag} foi desbanido(a) com sucesso.`;
        }

        return '🛑 » O usuário não estava banido ou ocorreu um erro ao tentar desbani-lo.';
    },

    /**
     * Função utilitária para restaurar cargos de uma punição específica
     * @param {GuildMember} executor - Quem está executando o comando.
     * @param {GuildMember} target - O usuário que terá os cargos restaurados.
     * @param {string} caseID - ID do caso para buscar os cargos salvos.
     * @returns {Promise<string>} - Mensagem de sucesso ou erro.
     */
    async restoreRoles(executor, target, caseID) {
        if (!executor.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return '🛑 » Você não tem permissão para gerenciar cargos.';
        }

        try {
            const punishment = await Punishment.findOne({
                guildID: executor.guild.id,
                caseID: caseID
            });

            if (!punishment) {
                return '🛑 » Caso não encontrado.';
            }

            if (!punishment.rolesID || punishment.rolesID.length === 0) {
                return '🛑 » Nenhum cargo foi salvo neste caso.';
            }

            const restored = await this.restoreUserRoles(target, punishment.rolesID, `Restauração de cargos do caso ${caseID}`);
            
            if (restored) {
                return `<:MineLand:1378843944263356516> » Cargos foram restaurados para ${target.user.tag}.`;
            } else {
                return '🛑 » Nenhum dos cargos salvos existe mais no servidor ou ocorreu um erro.';
            }
        } catch (error) {
            console.error('Erro ao restaurar cargos:', error);
            return '🛑 » Ocorreu um erro ao tentar restaurar os cargos.';
        }
    }
};
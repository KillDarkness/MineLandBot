const { PermissionsBitField } = require('discord.js');
const config = require('../config');
const Punishment = require('../MongoDB/Models/Punishment'); // Importa o modelo que criamos

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
            active: options.active !== undefined ? options.active : true
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

        if (target.roles.highest.position >= executor.roles.highest.position) {
            return '🛑 » Você não pode expulsar alguém com um cargo superior ao seu.';
        }

        try {
            await target.kick(reason);
            
            // Registra no banco de dados
            await this.logPunishment({
                guildID: executor.guild.id,
                staffID: executor.id,
                targetID: target.id,
                punishType: 'kick',
                reason
            });
            
            return `✅ » ${target.user.tag} foi expulso(a) com sucesso.`;
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
     * @param {number} [days=0] - Número de dias de mensagens para apagar.
     * @returns {Promise<string>} - Mensagem de sucesso ou erro.
     */
    async ban(executor, target, reason = 'Sem motivo fornecido.', days = 0) {
        if (!executor.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return '🛑 » Você não tem permissão para banir membros.';
        }

        if (target.roles.highest.position >= executor.roles.highest.position) {
            return '🛑 » Você não pode banir esse usuário.';
        }

        const banRole = executor.guild.roles.cache.get(config.punishRoles.ban);
        if (banRole) {
            try {
                await target.roles.add(banRole, reason);
                
                // Registra no banco de dados
                await this.logPunishment({
                    guildID: executor.guild.id,
                    staffID: executor.id,
                    targetID: target.id,
                    punishType: 'ban',
                    reason,
                    active: true
                });
                
                return `✅ » ${target.user.tag} foi **__banido(a)__** com sucesso!.`;
            } catch (error) {
                console.error(error);
                return '🛑 » Ocorreu um erro ao tentar banir o usuário.';
            }
        }

        try {
            await target.ban({ reason, deleteMessageDays: days });
            
            // Registra no banco de dados
            await this.logPunishment({
                guildID: executor.guild.id,
                staffID: executor.id,
                targetID: target.id,
                punishType: 'ban',
                reason,
                active: true
            });
            
            return `✅ » ${target.user.tag} foi **__banido(a)__** com sucesso!.`;
        } catch (error) {
            console.error(error);
            return '🛑 » Ocorreu um erro ao tentar banir o usuário.';
        }
    },

    /**
     * Silencia um usuário no servidor.
     * @param {GuildMember} executor - Quem está executando o comando.
     * @param {GuildMember} target - O usuário a ser silenciado.
     * @param {string} reason - O motivo do silêncio.
     * @param {number} time - Tempo de mute em milissegundos.
     * @returns {Promise<string>} - Mensagem de sucesso ou erro.
     */
    async mute(executor, target, reason = 'Sem motivo fornecido.', time = null) {
        if (!executor.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return '🛑 » Você não tem permissão para gerenciar cargos.';
        }

        if (target.roles.highest.position >= executor.roles.highest.position) {
            return '🛑 » Você não pode silenciar esse usuário.';
        }

        const muteRole = executor.guild.roles.cache.get(config.punishRoles.mute);
        if (muteRole) {
            try {
                await target.roles.add(muteRole, reason);
                
                // Calcula a data de expiração se houver tempo definido
                const expires = time ? new Date(Date.now() + time) : null;
                const duration = time ? this.formatDuration(time) : null;
                
                // Registra no banco de dados
                await this.logPunishment({
                    guildID: executor.guild.id,
                    staffID: executor.id,
                    targetID: target.id,
                    punishType: 'mute',
                    reason,
                    expires,
                    duration,
                    active: true
                });
                
                if (time) {
                    setTimeout(async () => {
                        await target.roles.remove(muteRole, 'Tempo de mute expirado.');
                        // Atualiza no banco de dados
                        await Punishment.findOneAndUpdate(
                            { guildID: executor.guild.id, targetID: target.id, active: true, punishType: 'mute' },
                            { active: false, removeDate: new Date(), removeReason: 'Tempo de mute expirado' }
                        );
                    }, time);
                }
                
                return `✅ » ${target.user.tag} foi **__silenciado(a)__** com sucesso!${duration ? ` por ${duration}` : ''}.`;
            } catch (error) {
                console.error(error);
                return '🛑 » Ocorreu um erro ao tentar silenciar o usuário.';
            }
        }

        if (time) {
            try {
                await target.timeout(time, reason);
                
                // Registra no banco de dados
                await this.logPunishment({
                    guildID: executor.guild.id,
                    staffID: executor.id,
                    targetID: target.id,
                    punishType: 'timeout',
                    reason,
                    expires: new Date(Date.now() + time),
                    duration: this.formatDuration(time),
                    active: true
                });
                
                return `✅ » ${target.user.tag} foi silenciado(a) por ${this.formatDuration(time)}.`;
            } catch (error) {
                console.error(error);
                return '🛑 » Ocorreu um erro ao tentar silenciar o usuário com timeout.';
            }
        }

        return '🛑 » Nenhum método de mute disponível foi encontrado.';
    },

    /**
     * Formata a duração em um formato legível
     * @param {number} ms - Duração em milissegundos
     * @returns {string} - Duração formatada
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
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

        if (target.roles.highest.position >= executor.roles.highest.position) {
            return '🛑 » Você não pode desmutar alguém com um cargo superior ao seu.';
        }

        const muteRole = executor.guild.roles.cache.get(config.punishRoles.mute);
        if (muteRole && target.roles.cache.has(muteRole.id)) {
            try {
                await target.roles.remove(muteRole, reason);
                
                // Atualiza no banco de dados
                await Punishment.findOneAndUpdate(
                    { guildID: executor.guild.id, targetID: target.id, active: true, punishType: 'mute' },
                    { active: false, removedBy: executor.id, removeReason: reason, removeDate: new Date() }
                );
                
                return `✅ » ${target.user.tag} foi desmutado(a).`;
            } catch (error) {
                console.error(error);
                return '🛑 » Ocorreu um erro ao tentar desmutar o usuário.';
            }
        }

        if (target.isCommunicationDisabled()) {
            try {
                await target.timeout(null, reason);
                
                // Atualiza no banco de dados
                await Punishment.findOneAndUpdate(
                    { guildID: executor.guild.id, targetID: target.id, active: true, punishType: 'timeout' },
                    { active: false, removedBy: executor.id, removeReason: reason, removeDate: new Date() }
                );
                
                return `✅ » ${target.user.tag} foi desmutado(a).`;
            } catch (error) {
                console.error(error);
                return '🛑 » Ocorreu um erro ao tentar remover o timeout do usuário.';
            }
        }

        return '🛑 » O usuário não está mutado.';
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

        try {
            await executor.guild.members.unban(target, reason);
            
            // Atualiza no banco de dados
            await Punishment.findOneAndUpdate(
                { guildID: executor.guild.id, targetID: target.id, active: true, punishType: 'ban' },
                { active: false, removedBy: executor.id, removeReason: reason, removeDate: new Date() }
            );
            
            return `✅ » ${target.tag} foi desbanido(a) com sucesso.`;
        } catch (error) {
            console.error(error);
            return '🛑 » Ocorreu um erro ao tentar desbanir o usuário.';
        }
    },
};
const { PermissionsBitField } = require('discord.js');
const config = require('../config'); // Importa o config

module.exports = {
    /**
     * Expulsa um usuário do servidor.
     * @param {GuildMember} executor - Quem está executando o comando.
     * @param {GuildMember} target - O usuário a ser expulso.
     * @param {string} reason - O motivo da expulsão.
     * @returns {Promise<string>} - Mensagem de sucesso ou erro.
     */
    async kick(executor, target, reason = 'Sem motivo fornecido.') {
        // Verifica se o executor tem permissão para expulsar
        if (!executor.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return '🛑 » Você não tem permissão para expulsar membros.';
        }

        // Verifica se o alvo tem um cargo superior
        if (target.roles.highest.position >= executor.roles.highest.position) {
            return '🛑 » Você não pode expulsar alguém com um cargo superior ao seu.';
        }

        try {
            await target.kick(reason);
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
     * @returns {Promise<string>} - Mensagem de sucesso ou erro.
     */
    async ban(executor, target, reason = 'Sem motivo fornecido.') {
        // Verifica se o executor tem permissão para banir
        if (!executor.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return '🛑 » Você não tem permissão para banir membros.';
        }

        // Verifica se o alvo tem um cargo superior
        if (target.roles.highest.position >= executor.roles.highest.position) {
            return '🛑 » Você não pode banir esse usuário.';
        }

        // Verifica se o cargo de ban específico existe
        const banRole = executor.guild.roles.cache.get(config.punishRoles.ban);
        if (banRole) {
            try {
                await target.roles.add(banRole, reason);
                return `✅ » ${target.user.tag} foi **__banido(a)__** com sucesso!.`;
            } catch (error) {
                console.error(error);
                return '🛑 » Ocorreu um erro ao tentar banir o usuário.';
            }
        }

        // Se o cargo de ban não existir, aplica o ban normal
        try {
            await target.ban({ reason });
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
        // Verifica se o executor tem permissão para gerenciar cargos
        if (!executor.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return '🛑 » Você não tem permissão para gerenciar cargos.';
        }

        // Verifica se o alvo tem um cargo superior
        if (target.roles.highest.position >= executor.roles.highest.position) {
            return '🛑 » Você não pode silenciar esse usuário.';
        }

        // Verifica se o cargo de mute específico existe
        const muteRole = executor.guild.roles.cache.get(config.punishRoles.mute);
        if (muteRole) {
            try {
                await target.roles.add(muteRole, reason);
                if (time) {
                    setTimeout(async () => {
                        await target.roles.remove(muteRole, 'Tempo de mute expirado.');
                    }, time);
                }
                return `✅ » ${target.user.tag} foi **__silenciado(a)__** com sucesso!.`;
            } catch (error) {
                console.error(error);
                return '🛑 » Ocorreu um erro ao tentar silenciar o usuário.';
            }
        }

        // Se o cargo de mute não existir, aplica o timeout
        if (time) {
            try {
                await target.timeout(time, reason);
                return `✅ » ${target.user.tag} foi silenciado(a) por ${time / 1000} segundos.`;
            } catch (error) {
                console.error(error);
                return '🛑 » Ocorreu um erro ao tentar silenciar o usuário com timeout.';
            }
        }

        return '🛑 » Nenhum método de mute disponível foi encontrado.';
    },

    /**
     * Remove o silêncio de um usuário no servidor.
     * @param {GuildMember} executor - Quem está executando o comando.
     * @param {GuildMember} target - O usuário a ser desmutado.
     * @param {string} reason - O motivo do desmute.
     * @returns {Promise<string>} - Mensagem de sucesso ou erro.
     */
    async unmute(executor, target, reason = 'Sem motivo fornecido.') {
        // Verifica se o executor tem permissão para gerenciar cargos
        if (!executor.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return '🛑 » Você não tem permissão para gerenciar cargos.';
        }

        // Verifica se o alvo tem um cargo superior
        if (target.roles.highest.position >= executor.roles.highest.position) {
            return '🛑 » Você não pode desmutar alguém com um cargo superior ao seu.';
        }

        // Verifica se o cargo de mute específico existe e se o usuário o possui
        const muteRole = executor.guild.roles.cache.get(config.punishRoles.mute);
        if (muteRole && target.roles.cache.has(muteRole.id)) {
            try {
                await target.roles.remove(muteRole, reason);
                return `✅ » ${target.user.tag} foi desmutado(a).`;
            } catch (error) {
                console.error(error);
                return '🛑 » Ocorreu um erro ao tentar desmutar o usuário.';
            }
        }

        // Verifica se o usuário está em timeout
        if (target.isCommunicationDisabled()) {
            try {
                await target.timeout(null, reason);
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
        // Verifica se o executor tem permissão para banir
        if (!executor.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return '🛑 » Você não tem permissão para desbanir membros.';
        }

        try {
            await executor.guild.members.unban(target, reason);
            return `✅ » ${target.tag} foi desbanido(a) com sucesso.`;
        } catch (error) {
            console.error(error);
            return '🛑 » Ocorreu um erro ao tentar desbanir o usuário.';
        }
    },
};
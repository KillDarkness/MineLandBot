const config = require('../config');
const Punishment = require('../MongoDB/Models/Punishment');
const Moderation = require('../Package/Moderation');

/**
 * Verifica se um usuário tem ban ativo e reaplica o cargo de ban
 * @param {GuildMember} member - Membro que entrou no servidor
 * @returns {Promise<boolean>} - true se o usuário foi banido, false caso contrário
 */
async function checkAndReapplyBan(member) {
    try {
        // Busca ban ativo para este usuário neste servidor
        const activeBan = await Punishment.findOne({
            guildID: member.guild.id,
            targetID: member.id,
            punishType: 'ban',
            active: true
        });

        if (!activeBan) {
            return false; // Usuário não tem ban ativo
        }

        // Verifica se existe cargo de ban configurado
        const banRole = member.guild.roles.cache.get(config.punishRoles?.ban);
        if (!banRole) {
            return false; // Cargo de ban não configurado
        }

        // Remove todos os cargos do usuário imediatamente
        await member.roles.set([], 'Reaplicação de ban ativo - remoção inicial');
        
        // Aguarda 2 segundos para garantir que autoroles não interfiram
        setTimeout(async () => {
            try {
                // Remove novamente todos os cargos e adiciona apenas o cargo de ban
                await member.roles.set([banRole], 'Reaplicação de ban ativo - aplicação final');
            } catch (error) {
                // Erro silencioso
            }
        }, 2000);

        return true; // Usuário foi banido novamente
    } catch (error) {
        return false; // Erro ao verificar/aplicar ban
    }
}

module.exports = {
    checkAndReapplyBan
};
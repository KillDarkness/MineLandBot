const { Client } = require('discord.js');

module.exports = {
    /**
     * Encontra um usuário com base em uma menção, ID ou tag.
     * @param {Client} client - O cliente do Discord.js.
     * @param {string} input - A entrada (menção, ID ou tag).
     * @param {Guild} guild - O servidor onde o usuário será buscado.
     * @returns {Promise<User|null>} - O usuário encontrado ou null.
     */
    async getUser(client, input, guild) {
        if (!input) return null; // Se não houver entrada, retorna null

        // Remove caracteres especiais da menção
        const mentionRegex = /^<@!?(\d+)>$/;
        const idFromMention = mentionRegex.exec(input)?.[1];

        try {
            // Busca o usuário por menção, ID ou tag
            const user = idFromMention
                ? await client.users.fetch(idFromMention) // Busca por menção ou ID
                : client.users.cache.find(u => u.tag === input || u.id === input); // Busca por tag ou ID

            if (!user) return null;

            // Verifica se o usuário está no servidor
            const member = guild.members.cache.get(user.id);
            return member ? user : null;
        } catch (error) {
            console.error('Erro ao buscar usuário:', error);
            return null;
        }
    },
};
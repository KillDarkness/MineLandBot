const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    // Informações do comando
    category: 'Utilitários',
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Responde com Pong!'),
    
    // Função de execução
    async execute(interaction, client) {
        const latency = Date.now() - interaction.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);
        
        await interaction.reply({
            content: `🏓 Pong!\n📡 Latência: ${latency}ms\n📶 API: ${apiLatency}ms`,
            ephemeral: true
        });
    }
};
const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
    name: 'loop',
    description: 'Ativa ou desativa o loop da fila',
    async execute(message) {
        const player = message.client.riffy.players.get(message.guild.id);

        if (!player) return message.channel.send("❌ Nenhuma música está tocando no momento.");

        const loopMode = player.loop === "none" ? "queue" : "none";
        player.setLoop(loopMode);

        const embed = new EmbedBuilder()
            .setColor(config.embedColor)
            .setDescription(`🔁 Loop ${loopMode === "queue" ? "ativado" : "desativado"}.`);

        message.channel.send({ embeds: [embed] });
    }
};
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'calc',
    description: '🧮 » Realiza cálculos matemáticos.',
    aliases: ['calcular'],
    execute(message, args) {
        const expression = args.join(' ');

        try {
            const result = eval(expression); // Cuidado ao usar eval!
            const embed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setDescription(`🧮 » Resultado: **${result}**`)

            message.reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            message.reply('🛑 » Expressão inválida.');
        }
    },
};
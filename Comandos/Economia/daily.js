const UserEconomy = require('../../MongoDB/Models/UserEconomy');

module.exports = {
    name: 'daily',
    aliases: ['diario', 'recompensa'],
    description: 'Pega sua recompensa diária de esmeraldas.',
    async execute(message) {
        const userId = message.author.id;
        
        // Quantidade de esmeraldas do daily (aleatório entre 3000 e 8000)
        const dailyAmount = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000;

        let userEconomy = await UserEconomy.findOne({ userId: userId });

        if (!userEconomy) {
            userEconomy = new UserEconomy({ userId: userId });
        }

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (userEconomy.lastDailyClaim) {
            const lastClaimDate = new Date(userEconomy.lastDailyClaim);
            const lastClaimDay = new Date(lastClaimDate.getFullYear(), lastClaimDate.getMonth(), lastClaimDate.getDate());

            if (lastClaimDay.getTime() === today.getTime()) {
                // Já pegou o daily hoje
                const nextClaimTime = new Date(today.getTime() + 24 * 60 * 60 * 1000); // Meia-noite do próximo dia
                const timestamp = Math.floor(nextClaimTime.getTime() / 1000);
                return message.reply(`⏰ » Você já pegou sua recompensa diária hoje! Volte <t:${timestamp}:R> para pegar novamente.`);
            }
        }

        // Concede a recompensa diária
        userEconomy.emeralds += dailyAmount;
        userEconomy.lastDailyClaim = now;
        await userEconomy.save();

        message.reply(`🎉 » Você pegou sua recompensa diária de **${dailyAmount.toLocaleString('pt-BR')}** Esmeraldas! Seu novo saldo é de **${userEconomy.emeralds.toLocaleString('pt-BR')}** Esmeraldas.`);
    },
};
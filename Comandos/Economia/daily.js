const UserEconomy = require('../../MongoDB/Models/UserEconomy');
const Artifacts = require('../../MongoDB/Models/Artifacts');

module.exports = {
    name: 'daily',
    aliases: ['diario', 'recompensa'],
    description: 'Pega sua recompensa diária de esmeraldas.',
    async execute(message) {
        const userId = message.author.id;
        
        let dailyAmount = Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000;
        let has2xDaily = false;

        const userArtifacts = await Artifacts.findOne({ userId });
        if (userArtifacts && userArtifacts.artifacts.some(a => a.artifactId === 'artifact_2x_daily')) {
            dailyAmount *= 2;
            has2xDaily = true;
        }

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
                const nextClaimTime = new Date(today.getTime() + 24 * 60 * 60 * 1000);
                const timestamp = Math.floor(nextClaimTime.getTime() / 1000);
                return message.reply(`⏰ » Você já pegou sua recompensa diária hoje! Volte <t:${timestamp}:R> para pegar novamente.`);
            }
        }

        userEconomy.emeralds += dailyAmount;
        userEconomy.lastDailyClaim = now;
        await userEconomy.save();

        let replyMessage = `🎉 » Você pegou sua recompensa diária de **${dailyAmount.toLocaleString('pt-BR')}** Esmeraldas! Seu novo saldo é de **${userEconomy.emeralds.toLocaleString('pt-BR')}** Esmeraldas.`;
        if (has2xDaily) {
            replyMessage += `\n-# Artefato 2x Daily Ativado!`;
        }

        message.reply(replyMessage);
    },
};
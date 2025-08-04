const UserEconomy = require('../../MongoDB/Models/UserEconomy');
const Artifacts = require('../../MongoDB/Models/Artifacts');
const { EmbedBuilder } = require('discord.js');

const phrases = [
    "<:emerald:1397996728195481761> Você minerou por uma hora e encontrou {amount} esmeraldas!",
    "<:wooden_axe:1397996916792623197> Você cortou madeira e vendeu por {amount} esmeraldas!",
    "<:stone_hoe:1397996890926219446> Você cuidou da fazenda e colheu {amount} esmeraldas!",
    "<:tropical_fish:1397996908596826215> Você pescou alguns peixes raros e vendeu por {amount} esmeraldas!",
    "<:diamond_sword:1397996721778200626> Você derrotou alguns monstros e conseguiu {amount} esmeraldas!",
];

module.exports = {
    name: 'work',
    aliases: ['trabalhar'],
    description: 'Trabalhe para ganhar esmeraldas.',
    cooldown: 5,
    async execute(message, args, client) {
        const userId = message.author.id;
        const userEconomy = await UserEconomy.findOne({ userId });
        const userArtifacts = await Artifacts.findOne({ userId });

        if (!userEconomy) {
            await UserEconomy.create({ userId, emeralds: 0, lastWork: new Date() });
        }

        const lastWork = userEconomy ? userEconomy.lastWork : null;
        let cooldown = 60 * 60 * 1000; // 1 hour in milliseconds
        let workBoostActive = false;

        if (userArtifacts) {
            const workBoostArtifact = userArtifacts.artifacts.find(artifact => artifact.artifactId === 'artifact_work_boost' && artifact.expiresAt > new Date());
            if (workBoostArtifact) {
                workBoostActive = true;
                cooldown = 45 * 60 * 1000; // 45 minutes in milliseconds
            }
        }

        if (lastWork && (new Date() - lastWork) < cooldown) {
            const remainingTime = cooldown - (new Date() - lastWork);
            const remainingMinutes = Math.ceil(remainingTime / (1000 * 60));
            return message.reply(`<:structure_void:1397996900023537855> Você já trabalhou recentemente. Tente novamente em ${remainingMinutes} minuto(s).`);
        }

        let amount = Math.floor(Math.random() * (1000 - 100 + 1)) + 10; // Random amount between 100 and 1000
        if (workBoostActive) {
            amount *= 2;
        }
        const phrase = phrases[Math.floor(Math.random() * phrases.length)];
        const successMessage = phrase.replace('{amount}', `**${amount}**`);

        await UserEconomy.findOneAndUpdate({ userId }, { $inc: { emeralds: amount }, lastWork: new Date() }, { upsert: true });

        let replyMessage = `## <:raw_gold:1397996863314989237> Trabalho Concluído!
 - ${successMessage}`;        if (workBoostActive) {            replyMessage += `
-# <:spectral_arrow:1397996885070839970> **Boost de Trabalho Ativo!** Você ganhou o dobro de esmeraldas e o tempo de espera foi reduzido!`;        }        message.reply(replyMessage);

        setTimeout(() => {
            const channel = client.channels.cache.get('1260754598000070656');
            if (channel) {
                channel.send(`<:emerald:1397996728195481761> <@${userId}>, você já pode trabalhar novamente! Use o comando \`/work\` para ganhar mais esmeraldas.`);
            }
        }, cooldown);
    }
};
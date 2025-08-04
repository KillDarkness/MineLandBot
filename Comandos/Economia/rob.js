const UserEconomy = require('../../MongoDB/Models/UserEconomy');
const MentionUser = require('../../Package/MentionUser');
const Permissions = require('../../MongoDB/Models/Permissions');
const Artifacts = require('../../MongoDB/Models/Artifacts');

module.exports = {
    name: 'rob',
    aliases: ['roubar', 'assaltar'],
    description: 'Tente roubar esmeraldas de outro usuário.',
    async execute(message, args, client) {
        const authorId = message.author.id;
        const targetUser = await MentionUser.getUser(client, args[0], message.guild);

        if (!targetUser) {
            return message.reply('Você precisa mencionar um usuário válido para roubar.');
        }

        if (targetUser.id === authorId) {
            return message.reply('<:structure_void:1397996900023537855> Você não pode roubar de si mesmo.');
        }

        const targetPermissions = await Permissions.findOne({ userID: targetUser.id });
        if (targetPermissions && targetPermissions.group.includes('master')) {
            let authorEconomy = await UserEconomy.findOne({ userId: authorId });
            if (!authorEconomy) {
                authorEconomy = await UserEconomy.create({ userId: authorId, emeralds: 0 });
            }
            const fine = Math.floor(authorEconomy.emeralds * 0.10);

            await UserEconomy.findOneAndUpdate({ userId: authorId }, { $inc: { emeralds: -fine } });
            await UserEconomy.findOneAndUpdate({ userId: targetUser.id }, { $inc: { emeralds: fine } });

            return message.reply(`**<:barrier:1397996625062002838> » Você tentou roubar um membro do governo e foi multado em ${fine} esmeraldas!**`);
        }

        const targetArtifacts = await Artifacts.findOne({ userId: targetUser.id });
        if (targetArtifacts && targetArtifacts.artifacts.some(a => a.artifactId === 'artifact_anti_rob')) {
            return message.reply('**<:barrier:1397996625062002838> » Você não pode roubar este usuário, ele está protegido por um artefato.**');
        }

        let authorEconomy = await UserEconomy.findOne({ userId: authorId });
        if (!authorEconomy) {
            authorEconomy = await UserEconomy.create({ userId: authorId, emeralds: 0 });
        }

        const lastRob = authorEconomy.lastRob;
        const cooldown = 10 * 60 * 60 * 1000; // 10 hours

        if (lastRob && (new Date() - lastRob) < cooldown) {
            const remainingTime = lastRob.getTime() + cooldown;
            return message.reply(`<:structure_void:1397996900023537855> Você precisa esperar para roubar novamente. Você poderá tentar novamente em <t:${Math.floor(remainingTime / 1000)}:R>.`);
        }

        let targetEconomy = await UserEconomy.findOne({ userId: targetUser.id });
        if (!targetEconomy || targetEconomy.emeralds <= 0) {
            return message.reply('<:structure_void:1397996900023537855> Este usuário não tem esmeraldas para serem roubadas.');
        }

        await UserEconomy.findOneAndUpdate({ userId: authorId }, { lastRob: new Date() });

        const successChance = 0.4; // 40% de sucesso
        const random = Math.random();

        if (random < successChance) {
            const amountStolen = Math.floor(targetEconomy.emeralds * (Math.random() * 0.2 + 0.05)); // Rouba de 5% a 25%
            if (amountStolen <= 0) {
                return message.reply(`<:barrier:1397996625062002838> Você falhou em roubar **${targetUser.username}** e não levou nada.`);
            }

            await UserEconomy.findOneAndUpdate({ userId: authorId }, { $inc: { emeralds: amountStolen } });
            await UserEconomy.findOneAndUpdate({ userId: targetUser.id }, { $inc: { emeralds: -amountStolen } });

            message.reply(`<:shears:1397996875872866504> Você conseguiu roubar **${amountStolen}** esmeraldas de **${targetUser.username}**!`);
        } else {
            const amountLost = Math.floor(authorEconomy.emeralds * (Math.random() * 0.15 + 0.05)); // Perde de 5% a 20%
            if (amountLost <= 0) {
                return message.reply(`<:barrier:1397996625062002838> Você falhou em roubar **${targetUser.username}** e não perdeu nada.`);
            }

            await UserEconomy.findOneAndUpdate({ userId: authorId }, { $inc: { emeralds: -amountLost } });

            message.reply(`<:barrier:1397996625062002838> Você falhou em roubar **${targetUser.username}** e perdeu **${amountLost}** esmeraldas.`);
        }
    }
};
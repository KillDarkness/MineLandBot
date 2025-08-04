const express = require('express');
const router = express.Router();
const LinkCode = require('../../MongoDB/Models/Link/LinkCode');
const UserLink = require('../../MongoDB/Models/Link/UserLink');

module.exports = (client) => {
    router.post('/', async (req, res) => {
        const { minecraftUsername, code } = req.body;

        if (!minecraftUsername || !code) {
            return res.status(400).json({ success: false, message: 'Nome de usuário do Minecraft e código são obrigatórios.' });
        }

        try {
            const linkCodeDoc = await LinkCode.findOne({ code });

            if (!linkCodeDoc) {
                return res.status(404).json({ success: false, message: 'Código de link inválido ou expirado.' });
            }

            if (linkCodeDoc.minecraftUsername.toLowerCase() !== minecraftUsername.toLowerCase()) {
                return res.status(403).json({ success: false, message: 'Este código não pertence a este nome de usuário do Minecraft.' });
            }

            // Verifica se o usuário do Discord já está linkado
            const existingLink = await UserLink.findOne({ discordId: linkCodeDoc.discordId });
            if (existingLink) {
                // Se já existe um link, atualiza o username e UUID do Minecraft
                existingLink.minecraftUUID = req.body.minecraftUUID; // Assumindo que o plugin enviará o UUID
                existingLink.minecraftUsername = minecraftUsername;
                await existingLink.save();
                await LinkCode.deleteOne({ code }); // Remove o código temporário
                return res.status(200).json({ success: true, message: 'Sua conta já estava linkada e foi atualizada com sucesso!' });
            }

            // Cria o novo link permanente
            const newUserLink = new UserLink({
                discordId: linkCodeDoc.discordId,
                minecraftUUID: req.body.minecraftUUID, // Assumindo que o plugin enviará o UUID
                minecraftUsername: minecraftUsername,
            });

            await newUserLink.save();
            await LinkCode.deleteOne({ code }); // Remove o código temporário

            // Opcional: Enviar uma mensagem de sucesso no Discord
            const user = await client.users.fetch(linkCodeDoc.discordId);
            if (user) {
                user.send(`Sua conta do Minecraft (\`${minecraftUsername}\`) foi vinculada com sucesso à sua conta do Discord!`);
            }

            return res.status(200).json({ success: true, message: 'Conta vinculada com sucesso!' });

        } catch (error) {
            console.error('[API] Erro ao processar link:', error);
            return res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
        }
    });

    return router;
};
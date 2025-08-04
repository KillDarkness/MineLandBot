const express = require('express');
const router = express.Router();
const axios = require('axios');
const UserLink = require('../../MongoDB/Models/Link/UserLink');

module.exports = (client) => {
    router.post('/link-request', async (req, res) => {
        const { discordId, discordUsername, minecraftUsername, code, channelId } = req.body;

        if (!discordId || !discordUsername || !minecraftUsername || !code || !channelId) {
            return res.status(400).json({ success: false, message: 'Faltando parâmetros na solicitação.' });
        }

        try {
            await axios.post('http://mc.mineland.pro:5259/api/link-request', req.body);
            res.status(200).json({ success: true, message: 'Solicitação de vinculação enviada ao jogo.' });
        } catch (error) {
            console.error('[API] Erro ao encaminhar solicitação de link para o plugin:', error.message);
            const status = error.response ? error.response.status : 500;
            const message = error.response ? error.response.data.message : 'Erro interno do servidor.';
            res.status(status).json({ success: false, message });
        }
    });

    router.post('/link-confirm', async (req, res) => {
        const { discordId, minecraftUsername, minecraftUUID, channelId } = req.body;
        console.log("[API] /link-confirm recebido:", req.body); // Log inicial

        if (!discordId || !minecraftUsername || !minecraftUUID || !channelId) {
            console.log('[API] Solicitação de confirmação de link com parâmetros ausentes.');
            return res.status(400).json({ success: false, message: 'Faltando parâmetros na solicitação.' });
        }

        try {
            let userLink = await UserLink.findOne({ discordId: discordId });

            if (userLink) {
                console.log(`[API] Link existente encontrado para discordId: ${discordId}. Atualizando...`);
                userLink.minecraftUUID = minecraftUUID;
                userLink.minecraftUsername = minecraftUsername;
            } else {
                console.log(`[API] Nenhum link existente encontrado para discordId: ${discordId}. Criando novo...`);
                userLink = new UserLink({
                    discordId: discordId,
                    minecraftUUID: minecraftUUID,
                    minecraftUsername: minecraftUsername,
                });
            }
            
            await userLink.save();
            console.log(`[API] Dados de vinculação salvos com sucesso para ${minecraftUsername} (${discordId})`);

            try {
                const channel = await client.channels.fetch(channelId);
                if (channel) {
                    await channel.send(`✅ A conta do Discord <@${discordId}> foi vinculada com sucesso à conta do Minecraft **${minecraftUsername}**!`);
                    console.log(`[API] Mensagem de confirmação enviada para o canal #${channel.name}.`);
                } else {
                    console.error(`[API] Canal com ID ${channelId} não pôde ser encontrado.`);
                }
            } catch (channelError) {
                console.error(`[API] Erro ao buscar canal ou enviar mensagem: ${channelError.message}`);
            }

            res.status(200).json({ success: true, message: 'Vinculação confirmada e salva.' });

        } catch (dbError) {
            console.error(`[API] Erro CRÍTICO no banco de dados ao salvar o link: ${dbError.stack}`);
            res.status(500).json({ success: false, message: 'Erro interno do servidor ao salvar os dados.' });
        }
    });

    return router;
};

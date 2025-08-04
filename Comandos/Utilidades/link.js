const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const UserLink = require('../../MongoDB/Models/Link/UserLink');

module.exports = {
    name: 'link',
    description: '🔗 » Vincula sua conta do Discord à sua conta do Minecraft.',
    aliases: ['vincular'],
    async execute(message, args) {
        const minecraftUsername = args[0];

        if (!minecraftUsername) {
            return message.reply('❌ » Por favor, forneça seu nome de usuário do Minecraft. Ex: `m.link SeuNomeDeUsuario`');
        }

        const existingUserLink = await UserLink.findOne({ discordId: message.author.id });
        if (existingUserLink) {
            return message.reply(`⚠️ » Sua conta do Discord já está vinculada à conta do Minecraft \`${existingUserLink.minecraftUsername}\`.`);
        }

        const generateCode = () => {
            return Math.random().toString(16).substring(2, 8).toUpperCase();
        };

        const code = generateCode();

        try {
            await axios.post('http://40.160.16.244:8883/api/link-request', {
                discordId: message.author.id,
                discordUsername: message.author.username,
                minecraftUsername: minecraftUsername,
                code: code,
                channelId: message.channel.id
            });

            const conteudo = `# 🔗 Vinculação de Conta \n - Uma solicitação de vinculação foi enviada para a conta do Minecraft **${minecraftUsername}**.`

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`show_link_code_${code}`)
                        .setLabel("Mostrar Código de Confirmação")
                        .setEmoji('💿')
                        .setStyle(ButtonStyle.Primary)
                );

            await message.reply({ content: conteudo, components: [row] });

        } catch (error) {
            if (error.response && error.response.status === 409) {
                return message.reply('❌ » Este nome de usuário do Minecraft já está vinculado a outra conta do Discord.');
            } else if (error.response && error.response.status === 404) {
                return message.reply('❌ » O jogador com esse nome de usuário não está online no momento. Tente novamente quando ele estiver online.');
            }
            console.error('[Discord Command] Erro ao enviar solicitação de link:', error);
            message.reply('❌ » Ocorreu um erro ao tentar enviar sua solicitação de vinculação. O servidor de jogo pode estar offline. Tente novamente mais tarde.');
        }
    },
};
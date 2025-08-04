const axios = require('axios');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
require('dotenv').config();

module.exports = {
    name: 'criar',
    description: 'Cria um canal baseado na estrutura do servidor usando IA',
    async execute(client, message, args) {
        // Verificar se o usuário tem permissões
        if (!message.member.permissions.has('MANAGE_CHANNELS')) {
            return message.reply('Você não tem permissão para criar canais!');
        }

        // Verificar se o nome do canal foi fornecido
        if (!args.length) {
            return message.reply('Por favor, forneça o nome do canal. Exemplo: `p!criar avisos`');
        }

        const canalNome = args.join('').toLowerCase();
        
        try {
            // Enviar mensagem de processamento
            const statusMsg = await message.channel.send('🔍 Analisando a estrutura do servidor...');
            
            // Obter todos os canais do servidor para análise
            const canais = message.guild.channels.cache.map(channel => {
                return {
                    nome: channel.name,
                    tipo: channel.type,
                    categoria: channel.parent ? channel.parent.name : null,
                    posicao: channel.position,
                    permissoes: channel.permissionOverwrites ? [...channel.permissionOverwrites.cache].map(([id, perm]) => {
                        return {
                            id: id,
                            allow: perm.allow ? perm.allow.toArray() : [],
                            deny: perm.deny ? perm.deny.toArray() : []
                        };
                    }) : []
                };
            });
            
            // Preparar o prompt para a IA
            const prompt = `
            Analise esta estrutura de canais de um servidor Discord e me ajude a criar um novo canal chamado "${canalNome}".
            
            Estrutura atual do servidor:
            ${JSON.stringify(canais, null, 2)}
            
            Por favor, recomende:
            1. Em qual categoria este canal deve ser criado
            2. Quais permissões devem ser aplicadas
            3. Se deve ser um canal de texto, voz ou anúncio
            4. Uma posição adequada para o canal
            5. Se deve usar algum emoji no nome como os outros canais
            
            Forneça apenas um objeto JSON com a configuração final para eu implementar.
            A resposta deve ser um JSON válido com os seguintes campos:
            {
              "tipo": "texto", // ou "voz" ou "anuncio"
              "categoria": "nome da categoria",
              "emoji": "emoji se necessário",
              "posicao": número da posição,
              "permissoes": []
            }
            `;
            
            await statusMsg.edit('🧠 Consultando IA para recomendações...');
            
            // Consultar a API do Gemini
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
                {
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            await statusMsg.edit('💭 Processando resposta da IA...');
            
            // Extrair a resposta da IA
            const aiResponse = response.data.candidates[0].content.parts[0].text;
            
            // Tentar extrair o JSON da resposta
            let canalConfig;
            try {
                // Buscar conteúdo entre delimitadores de código se existirem
                const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                                  aiResponse.match(/```\s*([\s\S]*?)\s*```/) ||
                                  aiResponse.match(/{[\s\S]*}/);
                
                const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : aiResponse;
                canalConfig = JSON.parse(jsonString);
                
                // Garantir que todos os campos necessários existam
                canalConfig.tipo = canalConfig.tipo || 'texto';
                if (typeof canalConfig.tipo !== 'string') {
                    canalConfig.tipo = 'texto';
                }
            } catch (error) {
                console.error('Erro ao analisar JSON:', error);
                await statusMsg.edit('❌ Não foi possível processar a resposta da IA. Tente novamente.');
                return;
            }
            
            // Analisar os canais existentes para detectar o separador comum
            const canaisTexto = message.guild.channels.cache.filter(c => ['GUILD_TEXT', 0].includes(c.type));
            let separador = '-'; // Separador padrão
            
            // Detectar o separador mais comum usado no servidor
            if (canaisTexto.size > 0) {
                const regexEmoji = /^(\p{Emoji}|\p{Emoji_Presentation}|\p{Extended_Pictographic})([-_|])/u;
                const separadores = [];
                
                canaisTexto.forEach(canal => {
                    const match = canal.name.match(regexEmoji);
                    if (match && match[2]) {
                        separadores.push(match[2]);
                    }
                });
                
                if (separadores.length > 0) {
                    // Encontrar o separador mais comum
                    const contagem = {};
                    separadores.forEach(sep => {
                        contagem[sep] = (contagem[sep] || 0) + 1;
                    });
                    
                    separador = Object.keys(contagem).reduce((a, b) => contagem[a] > contagem[b] ? a : b, '-');
                }
            }
            
            // Adicionar emoji ao nome usando o separador detectado
            const nomeFinal = canalConfig.emoji ? 
                `${canalConfig.emoji}${separador}${canalNome}` : canalNome;
            
            // Obter a categoria se especificada
            let categoria = null;
            if (canalConfig.categoria) {
                categoria = message.guild.channels.cache.find(c => 
                    ['GUILD_CATEGORY', 4].includes(c.type) && 
                    c.name.toLowerCase() === canalConfig.categoria.toLowerCase()
                );
            }
            
            // Mapear o tipo de canal para o enum ChannelType
            let canalTipo;
            const tipoCanal = String(canalConfig.tipo).toLowerCase();
            
            switch (tipoCanal) {
                case 'voz':
                    canalTipo = ChannelType.GuildVoice;
                    break;
                case 'anuncio':
                case 'anúncio':
                case 'announcement':
                    canalTipo = ChannelType.GuildAnnouncement;
                    break;
                default:
                    canalTipo = ChannelType.GuildText;
            }
            
            // Criar mensagem de confirmação simples
            await statusMsg.delete();
            
            // Botões de confirmação
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirmar_canal')
                        .setLabel('Confirmar')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('cancelar_canal')
                        .setLabel('Cancelar')
                        .setStyle(ButtonStyle.Danger)
                );
            
            const confirmMsg = await message.channel.send({ 
                content: `Deseja criar o canal **${nomeFinal}**?`,
                components: [row]
            });
            
            // Coletor para os botões
            const filter = i => {
                return ['confirmar_canal', 'cancelar_canal'].includes(i.customId) && i.user.id === message.author.id;
            };
            
            const collector = confirmMsg.createMessageComponentCollector({ filter, time: 60000 });
            
            collector.on('collect', async i => {
                if (i.customId === 'confirmar_canal') {
                    await i.update({ content: '🛠️ Criando o canal...', components: [] });
                    
                    try {
                        // Criar o canal usando o formato compatível com discord.js v14
                        const channelOptions = {
                            name: nomeFinal,
                            type: canalTipo,
                            parent: categoria ? categoria.id : null,
                            reason: `Canal criado por ${message.author.tag} usando IA`
                        };
                        
                        const novoCanal = await message.guild.channels.create(channelOptions);
                        
                        // Aplicar permissões se especificadas
                        if (canalConfig.permissoes && Array.isArray(canalConfig.permissoes) && canalConfig.permissoes.length > 0) {
                            for (const perm of canalConfig.permissoes) {
                                if (perm && perm.id && (perm.allow || perm.deny)) {
                                    try {
                                        const permObj = {};
                                        
                                        if (Array.isArray(perm.allow)) {
                                            perm.allow.forEach(p => {
                                                permObj[p] = true;
                                            });
                                        }
                                        
                                        if (Array.isArray(perm.deny)) {
                                            perm.deny.forEach(p => {
                                                permObj[p] = false;
                                            });
                                        }
                                        
                                        await novoCanal.permissionOverwrites.create(perm.id, permObj);
                                    } catch (permError) {
                                        console.error('Erro ao aplicar permissão:', permError);
                                    }
                                }
                            }
                        }
                        
                        // Atualizar posição se especificada
                        if (typeof canalConfig.posicao === 'number') {
                            try {
                                await novoCanal.setPosition(canalConfig.posicao);
                            } catch (posError) {
                                console.error('Erro ao ajustar posição:', posError);
                            }
                        }
                        
                        await confirmMsg.edit({
                            content: `✅ Canal ${novoCanal} criado com sucesso!`,
                            components: []
                        });
                    } catch (error) {
                        console.error('Erro ao criar canal:', error);
                        await confirmMsg.edit({
                            content: `❌ Ocorreu um erro ao criar o canal: ${error.message}`,
                            components: []
                        });
                    }
                } else if (i.customId === 'cancelar_canal') {
                    await i.update({
                        content: '❌ Criação de canal cancelada.',
                        components: []
                    });
                }
            });
            
            collector.on('end', async collected => {
                if (collected.size === 0) {
                    await confirmMsg.edit({
                        content: '⏱️ Tempo esgotado. Criação de canal cancelada.',
                        components: []
                    });
                }
            });
            
        } catch (error) {
            console.error('Erro ao processar comando:', error);
            message.channel.send(`❌ Ocorreu um erro: ${error.message}`);
        }
    }
};
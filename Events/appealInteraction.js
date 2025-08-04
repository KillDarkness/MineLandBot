const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Punishment = require('../MongoDB/Models/Punishment');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            // Verifica se é um botão de appeal
            if (interaction.isButton() && interaction.customId === 'appeal_request') {
                await handleAppealButton(interaction);
            }
            
            // Verifica se é o modal de appeal sendo enviado
            if (interaction.isModalSubmit() && interaction.customId === 'appeal_modal') {
                await handleAppealModal(interaction);
            }
            
            // Verifica se é um botão de aceitar ou rejeitar - CORRIGIDO
            if (interaction.isButton() && (interaction.customId.startsWith('appeal_accept_') || interaction.customId.startsWith('appeal_reject_'))) {
                await handleAppealDecision(interaction);
            }
        } catch (error) {
            console.error('Erro no sistema de appeal:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ » Ocorreu um erro ao processar seu appeal. Tente novamente.',
                    flags: 'Ephemeral'
                });
            }
        }
    }
};

async function handleAppealButton(interaction) {
    // Verifica se o canal de fórum existe
    const forumChannel = interaction.guild.channels.cache.get('1354262189636194476');
    
    if (!forumChannel) {
        return interaction.reply({
            content: '❌ » Canal de appeals não encontrado. Contate um administrador.',
            flags: 'Ephemeral'
        });
    }

    // Verifica se existe um appeal aberto (com tag "Open") - CORRIGIDO E MELHORADO
    const openTag = forumChannel.availableTags.find(tag => tag.name.toLowerCase() === 'open');
    if (!openTag) {
        return interaction.reply({
            content: '❌ » Tag "Open" não configurada no canal de appeals. Contate um administrador.',
            flags: 'Ephemeral'
        });
    }

    // Busca threads ativos E arquivados mais recentemente
    const activeThreads = await forumChannel.threads.fetchActive();
    const archivedThreads = await forumChannel.threads.fetchArchived({ limit: 100 });
    
    // Combina todos os threads
    const allThreads = new Map([...activeThreads.threads, ...archivedThreads.threads]);
    
    // CORRIGIDO: Verifica se existe um appeal ATIVO com tag "Open" do usuário
    const existingOpenPost = Array.from(allThreads.values()).find(thread => 
        thread.appliedTags.includes(openTag.id) && 
        thread.ownerId === interaction.user.id &&
        !thread.archived &&
        !thread.locked
    );

    if (existingOpenPost) {
        return interaction.reply({
            content: `⚠️ » Você já possui um appeal aberto: ${existingOpenPost}. Aguarde a resposta da equipe antes de enviar um novo.`,
            flags: 'Ephemeral'
        });
    }

    // CORRIGIDO: Verifica cooldown de 48 horas baseado no último appeal fechado
    const acceptedTag = forumChannel.availableTags.find(tag => tag.name.toLowerCase() === 'accepted');
    const rejectedTag = forumChannel.availableTags.find(tag => tag.name.toLowerCase() === 'rejected');
    
    if (acceptedTag && rejectedTag) {
        // Busca TODOS os appeals fechados (aceitos ou rejeitados) do usuário
        const userClosedThreads = Array.from(allThreads.values())
            .filter(thread => 
                thread.ownerId === interaction.user.id && 
                (thread.appliedTags.includes(acceptedTag.id) || thread.appliedTags.includes(rejectedTag.id))
            )
            .sort((a, b) => b.createdTimestamp - a.createdTimestamp);

        const lastClosedAppeal = userClosedThreads[0]; // Mais recente

        if (lastClosedAppeal) {
            const now = Date.now();
            const cooldownTime = 48 * 60 * 60 * 1000; // 48 horas em milissegundos
            const timeSinceLastAppeal = now - lastClosedAppeal.createdTimestamp;

            if (timeSinceLastAppeal < cooldownTime) {
                const timeLeft = Math.ceil((cooldownTime - timeSinceLastAppeal) / (60 * 60 * 1000));
                return interaction.reply({
                    content: `⏳ » Você deve aguardar **${timeLeft} horas** antes de enviar um novo appeal após seu último appeal ter sido fechado.\n\n**Último appeal:** ${lastClosedAppeal.name}\n**Criado em:** <t:${Math.floor(lastClosedAppeal.createdTimestamp / 1000)}:F>`,
                    flags: 'Ephemeral'
                });
            }
        }
    }

    // CORRIGIDO: Sistema de cooldown melhorado
    if (!interaction.client.cooldowns) {
        interaction.client.cooldowns = new Map();
    }
    
    const cooldownKey = `appeal_cooldown_${interaction.user.id}`;
    const lastAppealTime = interaction.client.cooldowns.get(cooldownKey);
    const now = Date.now();
    const cooldownTime = 48 * 60 * 60 * 1000; // 48 horas em milissegundos

    if (lastAppealTime && now - lastAppealTime < cooldownTime) {
        const timeLeft = Math.ceil((cooldownTime - (now - lastAppealTime)) / (60 * 60 * 1000));
        return interaction.reply({
            content: `⏳ » Você deve aguardar **${timeLeft} horas** antes de enviar um novo appeal.\n\n**Último envio:** <t:${Math.floor(lastAppealTime / 1000)}:F>`,
            flags: 'Ephemeral'
        });
    }

    // Cria o modal com as perguntas
    const modal = new ModalBuilder()
        .setCustomId('appeal_modal')
        .setTitle('📋 Formulário de Appeal');

    // Pergunta 1: Se arrepende
    const regretInput = new TextInputBuilder()
        .setCustomId('regret_question')
        .setLabel('Você se arrepende de suas ações?')
        .setPlaceholder('Explique se você se arrepende e por quê...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500);

    // Pergunta 2: Por que fez isso
    const reasonInput = new TextInputBuilder()
        .setCustomId('reason_question')
        .setLabel('Por que você fez isso?')
        .setPlaceholder('Explique os motivos que levaram às suas ações...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500);

    // Pergunta 3: O que aprendeu
    const learnedInput = new TextInputBuilder()
        .setCustomId('learned_question')
        .setLabel('O que você aprendeu com essa situação?')
        .setPlaceholder('Descreva o que aprendeu e como pretende agir no futuro...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500);

    // Pergunta 4: Por que deveria ser perdoado
    const forgiveInput = new TextInputBuilder()
        .setCustomId('forgive_question')
        .setLabel('Por que deveria ser perdoado(a)?')
        .setPlaceholder('Convença-nos de que merece uma segunda chance...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500);

    // Pergunta 5: Informações adicionais
    const additionalInput = new TextInputBuilder()
        .setCustomId('additional_question')
        .setLabel('Informações adicionais (opcional)')
        .setPlaceholder('Algo mais que gostaria de adicionar...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(300);

    // Adiciona os inputs ao modal
    const firstRow = new ActionRowBuilder().addComponents(regretInput);
    const secondRow = new ActionRowBuilder().addComponents(reasonInput);
    const thirdRow = new ActionRowBuilder().addComponents(learnedInput);
    const fourthRow = new ActionRowBuilder().addComponents(forgiveInput);
    const fifthRow = new ActionRowBuilder().addComponents(additionalInput);

    modal.addComponents(firstRow, secondRow, thirdRow, fourthRow, fifthRow);

    await interaction.showModal(modal);
}

async function handleAppealModal(interaction) {
    await interaction.deferReply({ flags: 'Ephemeral' });

    // Pega as respostas do modal
    const regret = interaction.fields.getTextInputValue('regret_question');
    const reason = interaction.fields.getTextInputValue('reason_question');
    const learned = interaction.fields.getTextInputValue('learned_question');
    const forgive = interaction.fields.getTextInputValue('forgive_question');
    const additional = interaction.fields.getTextInputValue('additional_question') || 'Nenhuma informação adicional fornecida.';

    // Pega o canal de fórum
    const forumChannel = interaction.guild.channels.cache.get('1354262189636194476');
    
    if (!forumChannel) {
        return interaction.editReply({
            content: '❌ » Canal de appeals não encontrado. Contate um administrador.',
            flags: 'Ephemeral'
        });
    }

    try {
        // Encontra a tag "Open"
        const openTag = forumChannel.availableTags.find(tag => tag.name.toLowerCase() === 'open');
        if (!openTag) {
            return interaction.editReply({
                content: '❌ » Tag "Open" não configurada no canal de appeals. Contate um administrador.',
                flags: 'Ephemeral'
            });
        }

        // Busca punição ativa do usuário
        const activePunishment = await Punishment.findOne({
            guildID: interaction.guild.id,
            targetID: interaction.user.id,
            active: true,
            punishType: { $in: ['ban', 'mute'] }
        }).sort({ date: -1 }); // Pega a mais recente

        // Cria embed com informações da punição
        let punishmentEmbed;
        if (activePunishment) {
            const staffMember = await interaction.guild.members.fetch(activePunishment.staffID).catch(() => null);
            const punishmentType = activePunishment.punishType === 'ban' ? '🔨 Banimento' : '🔇 Silenciamento';
            const punishmentDate = Math.floor(activePunishment.date.getTime() / 1000);
            
            let durationText = '';
            if (activePunishment.punishType === 'mute' && activePunishment.expires) {
                const expiresTimestamp = Math.floor(activePunishment.expires.getTime() / 1000);
                durationText = `**Expira:** <t:${expiresTimestamp}:R>\n**Duração:** ${activePunishment.duration || 'Permanente'}`;
            } else {
                durationText = '**Duração:** Permanente';
            }

            punishmentEmbed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('📋 Informações da Punição')
                .setDescription(`**Usuário:** ${interaction.user} (${interaction.user.tag})\n**Tipo:** ${punishmentType}\n**Status:** Ativo`)
                .addFields(
                    {
                        name: '📅 Data da Punição',
                        value: `<t:${punishmentDate}:F>`,
                        inline: true
                    },
                    {
                        name: '👮 Staff Responsável',
                        value: staffMember ? `${staffMember.user.tag}` : 'Usuário não encontrado',
                        inline: true
                    },
                    {
                        name: '⏰ Duração',
                        value: durationText,
                        inline: false
                    },
                    {
                        name: '📝 Motivo da Punição',
                        value: `\`\`\`${activePunishment.reason || 'Motivo não especificado'}\`\`\``,
                        inline: false
                    },
                    {
                        name: '🔗 Case ID',
                        value: `\`${activePunishment.caseID}\``,
                        inline: true
                    }
                )
                .setThumbnail(interaction.user.displayAvatarURL())
                .setTimestamp()
                .setFooter({
                    text: 'Informações da Punição',
                    iconURL: interaction.guild.iconURL()
                });
        } else {
            punishmentEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('⚠️ Informações da Punição')
                .setDescription(`**Usuário:** ${interaction.user} (${interaction.user.tag})\n\n❌ Não foi possível encontrar informações detalhadas sobre a punição ativa deste usuário.\n\nIsso pode acontecer se:\n• A punição foi aplicada antes da implementação do sistema\n• Houve algum erro no registro da punição\n• A punição foi removida recentemente`)
                .setThumbnail(interaction.user.displayAvatarURL())
                .setTimestamp()
                .setFooter({
                    text: 'Sistema de Appeals • Informação Limitada',
                    iconURL: interaction.guild.iconURL()
                });
        }

        // Cria a embed com as respostas do usuário - visual melhorado
        const appealEmbed = new EmbedBuilder()
            .setColor('#4ECDC4')
            .setTitle('📋 Respostas do Appeal')
            .setDescription(`**Formulário preenchido por:** ${interaction.user}\n**Data de envio:** <t:${Math.floor(Date.now() / 1000)}:F>`)
            .addFields(
                {
                    name: '💭 **Você se arrepende de suas ações?**',
                    value: `> ${regret.split('\n').join('\n> ')}`,
                    inline: false
                },
                {
                    name: '🤔 **Por que você fez isso?**',
                    value: `> ${reason.split('\n').join('\n> ')}`,
                    inline: false
                },
                {
                    name: '📚 **O que você aprendeu com essa situação?**',
                    value: `> ${learned.split('\n').join('\n> ')}`,
                    inline: false
                },
                {
                    name: '🙏 **Por que deveria ser perdoado(a)?**',
                    value: `> ${forgive.split('\n').join('\n> ')}`,
                    inline: false
                },
                {
                    name: '📝 **Informações Adicionais**',
                    value: `> ${additional.split('\n').join('\n> ')}`,
                    inline: false
                }
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp()
            .setFooter({
                text: 'Sistema de Appeals • Aguardando Análise',
                iconURL: interaction.guild.iconURL()
            });

        // Cria o botão de aceitar e rejeitar
        const acceptButton = new ButtonBuilder()
            .setCustomId(`appeal_accept_${interaction.user.id}`)
            .setLabel('Aceitar Appeal')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅');
            
        const rejectButton = new ButtonBuilder()
            .setCustomId(`appeal_reject_${interaction.user.id}`)
            .setLabel('Rejeitar Appeal')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌');

        const row = new ActionRowBuilder()
            .addComponents(acceptButton, rejectButton);

        // Cria o post no fórum com @everyone e tag "Open"
        const thread = await forumChannel.threads.create({
            name: `Appeal - ${interaction.user.username} - ${new Date().toLocaleString('pt-BR')}`,
            appliedTags: [openTag.id],
            message: {
                content: `@everyone\n\n📋 **Novo Appeal Recebido**\n\n${interaction.user} enviou um appeal para revisão.\n\n**Equipe de Adminstração:** Por favor, analisem as informações e respostas abaixo antes de tomar uma decisão.`,
                embeds: [punishmentEmbed, appealEmbed],
                components: [row]
            }
        });

        // CORRIGIDO: Registra o cooldown corretamente
        if (!interaction.client.cooldowns) {
            interaction.client.cooldowns = new Map();
        }
        interaction.client.cooldowns.set(`appeal_cooldown_${interaction.user.id}`, Date.now());

        // Envia mensagem de confirmação para o usuário
        await interaction.editReply({
            content: '✅ » Seu appeal foi enviado com sucesso! Você será notificado sobre a decisão da equipe em até 48 horas.',
            flags: 'Ephemeral'
        });

        // Envia DM para o usuário
        try {
            await interaction.user.send({
                content: '📬 **Seu appeal foi recebido!**\n\nObrigado por enviar seu appeal. Nossa equipe de Adminstração irá revisar suas respostas e você será notificado sobre a decisão em até 48 horas. Por favor, aguarde.',
            });
        } catch (dmError) {
            console.error('Erro ao enviar DM:', dmError);
        }

    } catch (error) {
        console.error('Erro ao criar post de appeal:', error);
        await interaction.editReply({
            content: '❌ » Erro ao criar o post de appeal. Tente novamente ou contate um administrador.',
            flags: 'Ephemeral'
        });
    }
}

async function handleAppealDecision(interaction) {
    // Verifica se o usuário tem permissão de administrador
    if (!interaction.member.permissions.has('Administrator')) {
        return interaction.reply({
            content: '🛑 » Você precisa de permissões de administrador para aceitar ou rejeitar appeals.',
            flags: 'Ephemeral'
        });
    }

    // CORRIGIDO: Não usar ephemeral para a decisão
    await interaction.deferReply();

    const forumChannel = interaction.guild.channels.cache.get('1354262189636194476');
    if (!forumChannel) {
        return interaction.editReply({
            content: '❌ » Canal de appeals não encontrado. Contate um administrador.'
        });
    }

    const openTag = forumChannel.availableTags.find(tag => tag.name.toLowerCase() === 'open');
    const acceptedTag = forumChannel.availableTags.find(tag => tag.name.toLowerCase() === 'accepted');
    const rejectedTag = forumChannel.availableTags.find(tag => tag.name.toLowerCase() === 'rejected');

    if (!openTag || !acceptedTag || !rejectedTag) {
        return interaction.editReply({
            content: '❌ » Tags necessárias ("Open", "Accepted", "Rejected") não configuradas no canal de appeals.'
        });
    }

    // Extrai o ID do usuário do customId do botão
    const userId = interaction.customId.split('_')[2];
    const isAccepted = interaction.customId.startsWith('appeal_accept');
    const newTag = isAccepted ? acceptedTag.id : rejectedTag.id;
    const statusText = isAccepted ? '✅ Aceito' : '❌ Rejeitado';
    const color = isAccepted ? '#00FF00' : '#FF0000';

    try {
        // Busca o usuário que fez o appeal
        let appealUser;
        try {
            appealUser = await interaction.guild.members.fetch(userId);
        } catch (fetchError) {
            // Se não conseguir buscar como membro, tenta buscar como usuário
            try {
                appealUser = await interaction.client.users.fetch(userId);
            } catch (userError) {
                console.error('Erro ao buscar usuário do appeal:', userError);
                return interaction.editReply({
                    content: '❌ » Não foi possível encontrar o usuário que fez o appeal.'
                });
            }
        }

        const thread = interaction.channel;

        // Atualiza a tag do thread
        await thread.setAppliedTags([newTag]);

        // CORRIGIDO: Aplicar cooldown quando o appeal for fechado
        if (!interaction.client.cooldowns) {
            interaction.client.cooldowns = new Map();
        }
        interaction.client.cooldowns.set(`appeal_cooldown_${userId}`, Date.now());

        // Atualiza as embeds originais
        const oldEmbeds = interaction.message.embeds;
        const updatedEmbeds = [];

        // Atualiza a primeira embed (informações da punição)
        if (oldEmbeds[0]) {
            const updatedPunishmentEmbed = new EmbedBuilder(oldEmbeds[0])
                .setColor(color);
            updatedEmbeds.push(updatedPunishmentEmbed);
        }

        // Atualiza a segunda embed (respostas do appeal)
        if (oldEmbeds[1]) {
            const oldAppealEmbed = oldEmbeds[1];
            const updatedAppealEmbed = new EmbedBuilder(oldAppealEmbed)
                .setColor(color)
                .setFooter({
                    text: `Sistema de Appeals • ${statusText}`,
                    iconURL: interaction.guild.iconURL()
                });
            updatedEmbeds.push(updatedAppealEmbed);
        }

        // Cria uma embed para a decisão - VISÍVEL PARA TODOS
        const decisionEmbed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`${isAccepted ? '✅' : '❌'} Appeal ${statusText}`)
            .setDescription(`O appeal de ${appealUser instanceof String ? `<@${appealUser}>` : appealUser} foi **${statusText.toLowerCase()}** por ${interaction.member}.\n\n**Data da decisão:** <t:${Math.floor(Date.now() / 1000)}:F>`)
            .setTimestamp()
            .setFooter({
                text: 'Decisão Final do Appeal',
                iconURL: interaction.guild.iconURL()
            });

        // Atualiza a mensagem original removendo os botões
        await interaction.message.edit({
            embeds: updatedEmbeds,
            components: []
        });

        // CORRIGIDO: Resposta não ephemeral para mostrar a decisão a todos
        await interaction.editReply({
            embeds: [decisionEmbed]
        });

        // Envia DM para o usuário
        const dmMessage = isAccepted
            ? `✅ **Appeal Aceito**\n\nSeu appeal foi revisado e **aceito** pela equipe de Adminstração de **${interaction.guild.name}**.\n\nObrigado por sua paciência e compreensão. Bem-vindo(a) de volta!`
            : `❌ **Appeal Rejeitado**\n\nSeu appeal foi revisado e **rejeitado** pela equipe de Adminstração de **${interaction.guild.name}**.\n\nVocê poderá enviar um novo appeal em **48 horas** caso deseje tentar novamente.`;

        try {
            await appealUser.send({ content: dmMessage });
        } catch (dmError) {
            console.error('Erro ao enviar DM:', dmError);
            // Envia mensagem adicional informando que não foi possível enviar DM
            await interaction.followUp({
                content: '⚠️ » Não foi possível enviar DM ao usuário. O appeal foi processado corretamente.',
                flags: 'Ephemeral'
            });
        }

    } catch (error) {
        console.error('Erro ao processar decisão do appeal:', error);
        await interaction.editReply({
            content: '❌ » Erro ao processar a decisão do appeal. Tente novamente ou contate um administrador.'
        });
    }
}
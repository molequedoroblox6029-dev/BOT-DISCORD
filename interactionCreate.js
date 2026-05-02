const { Events, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        // --- BOTÃO DE ABRIR CADASTRO ---
        if (interaction.isButton() && interaction.customId === 'abrir_cadastro') {
            const modal = new ModalBuilder()
                .setCustomId('modal_cadastro')
                .setTitle('Formulário de Cadastro');

            const nomeInput = new TextInputBuilder()
                .setCustomId('input_nome')
                .setLabel('Nome Completo')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const idInput = new TextInputBuilder()
                .setCustomId('input_id')
                .setLabel('ID (Passaporte)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const delegaciaInput = new TextInputBuilder()
                .setCustomId('input_delegacia')
                .setLabel('Delegacia')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const contratanteInput = new TextInputBuilder()
                .setCustomId('input_contratante')
                .setLabel('Quem contratou você?')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const telefoneInput = new TextInputBuilder()
                .setCustomId('input_telefone')
                .setLabel('Telefone')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nomeInput),
                new ActionRowBuilder().addComponents(idInput),
                new ActionRowBuilder().addComponents(delegaciaInput),
                new ActionRowBuilder().addComponents(contratanteInput),
                new ActionRowBuilder().addComponents(telefoneInput)
            );

            await interaction.showModal(modal);
        }

        // --- RECEBER O MODAL ---
        if (interaction.isModalSubmit() && interaction.customId === 'modal_cadastro') {
            await interaction.reply({ content: 'Seu cadastro foi enviado para análise!', ephemeral: true });

            const nome = interaction.fields.getTextInputValue('input_nome');
            const passaporte = interaction.fields.getTextInputValue('input_id');
            const delegacia = interaction.fields.getTextInputValue('input_delegacia');
            const contratante = interaction.fields.getTextInputValue('input_contratante');
            const telefone = interaction.fields.getTextInputValue('input_telefone');

            // Gerar ID unico simples
            const cadastroId = Math.random().toString(36).substring(2, 10).toUpperCase();

            const embed = new EmbedBuilder()
                .setTitle(`Novo Cadastro - ${cadastroId}`)
                .setColor('#ffaa00')
                .addFields(
                    { name: '👤 Nome', value: nome, inline: true },
                    { name: '🆔 ID', value: passaporte, inline: true },
                    { name: '🏢 Delegacia', value: delegacia, inline: true },
                    { name: '👮 Contratado por', value: contratante, inline: true },
                    { name: '📞 Telefone', value: telefone, inline: true },
                    { name: '👤 Usuário do Discord', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: false },
                    { name: 'Status', value: '⏳ PENDENTE', inline: false }
                )
                .setTimestamp()
                .setFooter({ text: `ID do Cadastro: ${cadastroId} | Solicitado por: ${interaction.user.id}` });

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`aprovar_${interaction.user.id}`)
                    .setLabel('✅ Aprovar')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`reprovar_${interaction.user.id}`)
                    .setLabel('❌ Reprovar')
                    .setStyle(ButtonStyle.Danger)
            );

            try {
                const pendentesChannel = client.channels.cache.get(config.channels.pendentes);
                if (pendentesChannel) {
                    await pendentesChannel.send({ embeds: [embed], components: [buttons] });
                }

                // Logs
                const logsChannel = client.channels.cache.get(config.channels.logs);
                if (logsChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('Logs - Novo Cadastro')
                        .setColor('#ffaa00')
                        .setDescription(`Usuário <@${interaction.user.id}> enviou um novo cadastro.\nID do Cadastro: **${cadastroId}**`)
                        .setTimestamp();
                    await logsChannel.send({ embeds: [logEmbed] });
                }
            } catch (err) {
                console.error('[ERRO] Falha ao enviar embed de cadastro pendente:', err);
            }
        }

        // --- BOTÕES DE APROVAR E REPROVAR ---
        if (interaction.isButton() && (interaction.customId.startsWith('aprovar_') || interaction.customId.startsWith('reprovar_'))) {
            const isAprovado = interaction.customId.startsWith('aprovar_');
            const targetUserId = interaction.customId.split('_')[1];

            // Verifica Permissão
            const isRecrutador = interaction.member.roles.cache.has(config.roles.recrutador);
            const isAdmin = interaction.member.roles.cache.has(config.roles.admin);

            if (!isRecrutador && !isAdmin) {
                return interaction.reply({ content: 'Você não tem permissão para usar este botão.', ephemeral: true });
            }

            const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
            const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
            
            // Editando o embed original para refletir o status
            originalEmbed.setColor(isAprovado ? '#00ff00' : '#ff0000');
            
            const fields = originalEmbed.data.fields;
            const statusIndex = fields.findIndex(f => f.name === 'Status');
            if (statusIndex !== -1) {
                fields[statusIndex].value = isAprovado ? `✅ APROVADO por <@${interaction.user.id}>` : `❌ REPROVADO por <@${interaction.user.id}>`;
            }

            try {
                // Remover a mensagem do canal de pendentes
                await interaction.message.delete();

                // Enviar para o canal correto
                const targetChannelId = isAprovado ? config.channels.aprovados : config.channels.reprovados;
                const targetChannel = client.channels.cache.get(targetChannelId);
                
                if (targetChannel) {
                    await targetChannel.send({ embeds: [originalEmbed] });
                }

                // Sistema de Aprovação
                if (isAprovado) {
                    if (targetMember) {
                        await targetMember.roles.add(config.roles.recruta).catch(console.error);
                        await targetMember.send("🎉 Seu cadastro foi aprovado! Bem-vindo à Polícia Imperial.").catch(() => console.log('Não foi possível enviar DM para o usuário.'));
                    }
                } else {
                    if (targetMember) {
                        await targetMember.send("❌ Seu cadastro foi reprovado. Procure um recrutador para mais informações.").catch(() => console.log('Não foi possível enviar DM para o usuário.'));
                    }
                }

                // Logs
                const logsChannel = client.channels.cache.get(config.channels.logs);
                if (logsChannel) {
                    const cadastroId = originalEmbed.data.footer.text.split(' | ')[0].replace('ID do Cadastro: ', '');
                    const logEmbed = new EmbedBuilder()
                        .setTitle(`Logs - Cadastro ${isAprovado ? 'Aprovado' : 'Reprovado'}`)
                        .setColor(isAprovado ? '#00ff00' : '#ff0000')
                        .setDescription(`O cadastro **${cadastroId}** do usuário <@${targetUserId}> foi ${isAprovado ? 'aprovado' : 'reprovado'} por <@${interaction.user.id}>.`)
                        .setTimestamp();
                    await logsChannel.send({ embeds: [logEmbed] });
                }

                await interaction.reply({ content: `Cadastro ${isAprovado ? 'aprovado' : 'reprovado'} com sucesso!`, ephemeral: true });

            } catch (error) {
                console.error('[ERRO] Falha ao processar botão de aprovação/reprovação:', error);
                if (!interaction.replied) {
                    await interaction.reply({ content: 'Ocorreu um erro ao processar esta ação.', ephemeral: true });
                }
            }
        }
    }
};

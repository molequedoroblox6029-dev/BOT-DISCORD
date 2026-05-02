const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`[BOT] Logado com sucesso como ${client.user.tag}`);

        // Verificando e enviando o embed de cadastro
        try {
            const guild = client.guilds.cache.get(config.guildId);
            if (!guild) return console.log('[ERRO] Guild não encontrada. Verifique o guildId no config.json');

            const channel = guild.channels.cache.get(config.channels.cadastros);
            if (!channel) return console.log('[ERRO] Canal de cadastros não encontrado. Verifique o ID no config.json');

            const embed = new EmbedBuilder()
                .setTitle('🚔 Polícia Imperial - Sistema de Cadastro')
                .setDescription('Clique no botão abaixo para realizar seu cadastro na corporação.')
                .setColor('#2b2d31');

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('abrir_cadastro')
                        .setLabel('📋 Realizar Cadastro')
                        .setStyle(ButtonStyle.Primary)
                );

            const dataPath = path.join(__dirname, '..', 'data.json');
            let data = { cadastroMessageId: null };

            if (fs.existsSync(dataPath)) {
                data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            }

            if (data.cadastroMessageId) {
                try {
                    const message = await channel.messages.fetch(data.cadastroMessageId);
                    await message.edit({ embeds: [embed], components: [row] });
                    console.log('[SISTEMA] Embed de cadastro atualizado com sucesso.');
                } catch (err) {
                    console.log('[SISTEMA] Mensagem anterior não encontrada. Enviando uma nova...');
                    const message = await channel.send({ embeds: [embed], components: [row] });
                    data.cadastroMessageId = message.id;
                    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
                }
            } else {
                const message = await channel.send({ embeds: [embed], components: [row] });
                data.cadastroMessageId = message.id;
                fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
                console.log('[SISTEMA] Embed de cadastro enviado com sucesso.');
            }

        } catch (error) {
            console.error('[ERRO] Falha ao processar o embed de cadastro no evento ready:', error);
        }
    },
};

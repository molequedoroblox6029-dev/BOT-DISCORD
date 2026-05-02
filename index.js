const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Inicializando o sistema de eventos
require('./eventHandler')(client);

// Tratamento de erros
process.on('unhandledRejection', (reason, promise) => {
    console.error('[ERRO NÃO TRATADO] Rejeição na Promise:', promise, 'Motivo:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('[ERRO NÃO TRATADO] Exceção Capturada:', error);
});

process.on('uncaughtExceptionMonitor', (error, origin) => {
    console.error('[ERRO NÃO TRATADO] Exceção Monitorada:', error, 'Origem:', origin);
});

client.login(process.env.TOKEN).catch(err => {
    console.error('[ERRO DE LOGIN] Verifique o TOKEN no painel da hospedagem!', err);
});

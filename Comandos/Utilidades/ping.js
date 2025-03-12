module.exports = {
    name: 'ping', // Nome do comando
    description: 'Responde com Pong!', // Descrição do comando
    execute(message, args) {
        message.reply('Pong!');
    },
};
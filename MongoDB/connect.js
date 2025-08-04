const mongoose = require('mongoose');
require('dotenv').config();


async function connect() {
    try {
        await mongoose.connect(process.env.MONGO_URI); // Remova as opções obsoletas
        console.log('✅ » Conectado ao MongoDB com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao conectar ao MongoDB:', error);
        process.exit(1); // Encerra o processo com erro
    }
}

module.exports = connect;
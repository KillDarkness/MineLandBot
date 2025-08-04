const express = require('express');

function startServer(client) {
    const app = express();
    const port = process.env.SERVER_PORT || 3000;

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Rota de teste
    app.get('/', (req, res) => {
        res.status(200).send('Servidor do MineLand Bot está no ar!');
    });

    app.use('/api/link', require('./routes/link')(client));
    app.use('/api', require('./routes/api')(client));

    app.listen(port, () => {
        console.log(`[HTTP] Servidor iniciado na porta ${port}`);
    });

    return app;
}

module.exports = startServer;

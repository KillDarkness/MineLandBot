# 🤖 MineLandBot

O MineLandBot é um bot para Discord focado em economia e moderação, com funcionalidades de música, inventário e muito mais. Ele foi projetado para ser um bot completo para servidores de Minecraft, mas pode ser usado em qualquer tipo de servidor.

## ✨ Funcionalidades

- 💰 **Economia:** Sistema de economia com comandos de trabalho, loja, roubo, etc.
- 🛡️ **Moderação:** Comandos para banir, mutar, expulsar e outras ferramentas de moderação.
- 🎵 **Música:** Reproduza músicas do YouTube, Spotify e outras fontes.
- 🎒 **Inventário:** Sistema de inventário para guardar e usar itens.
- 🛠️ **Utilidades:** Comandos úteis como informações do servidor, do usuário, etc.

## 📚 Comandos

O prefixo padrão do bot é `m.`.

### 👑 Administração

- `backup`: Cria um backup do servidor.
- `criar`: Cria cargos e canais.
- `relatorio`: Gera um relatório do servidor.
- `syncmessages`: Sincroniza as mensagens de um canal.

### 💸 Economia

- `atm`: Mostra o seu saldo ou o de outro usuário.
- `daily`: Coleta a sua recompensa diária.
- `mlec`: Mostra o ranking de economia.
- `pay`: Paga uma quantia para outro usuário.
- `rob`: Tenta roubar esmeraldas de outro usuário.
- `topmoney`: Mostra o ranking de esmeraldas.
- `work`: Trabalha para ganhar esmeraldas.

### 🎒 Inventário

- `give`: Dá um item para outro usuário.
- `inventory`: Mostra o seu inventário.
- `use`: Usa um item do seu inventário.

### 🛡️ Moderação

- `ban`: Bane um usuário do servidor.
- `clear`: Limpa as mensagens de um canal.
- `kick`: Expulsa um usuário do servidor.
- `mute`: Muta um usuário no servidor.
- `setnick`: Altera o apelido de um usuário.
- `unban`: Desbane um usuário do servidor.
- `unmute`: Desmuta um usuário no servidor.

### 🎵 Música

- `loop`: Ativa ou desativa o loop da música.
- `nowplaying`: Mostra a música que está tocando.
- `pause`: Pausa a música.
- `play`: Reproduz uma música.
- `queue`: Mostra a fila de músicas.
- `resume`: Continua a música.
- `skip`: Pula para a próxima música.
- `stop`: Para a música e limpa a fila.

### 🛠️ Utilidades

- `artifacts`: Mostra os seus artefatos ativos.
- `avatar`: Mostra o avatar de um usuário.
- `calculator`: Uma calculadora.
- `coinflip`: Joga uma moeda.
- `link`: Linka a sua conta do Minecraft.
- `roleinfo`: Mostra informações sobre um cargo.
- `serverinfo`: Mostra informações sobre o servidor.
- `uptime`: Mostra o tempo de atividade do bot.
- `userinfo`: Mostra informações sobre um usuário.

## 🚀 Instalação e Configuração

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/KillDarkness/MineLandBot
    cd MineLandBot
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configure as variáveis de ambiente:**
    Crie um arquivo `.env` na raiz do projeto e adicione as seguintes variáveis:
    ```
    TOKEN=seu-token-do-discord
    MONGO_URI=sua-uri-do-mongodb
    LAVALINK_HOST=seu-host-do-lavalink
    LAVALINK_PASSWORD=sua-senha-do-lavalink
    LAVALINK_PORT=sua-porta-do-lavalink
    LAVALINK_SECURE=false
    SPOTIFY_CLIENT_ID=seu-client-id-do-spotify
    SPOTIFY_CLIENT_SECRET=seu-client-secret-do-spotify
    ```

4.  **Inicie o bot:**
    ```bash
    npm run dev
    ```

## 🙌 Contribuição

Contribuições são bem-vindas! Se você tiver alguma ideia ou sugestão, sinta-se à vontade para abrir uma issue ou um pull request.
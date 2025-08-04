const { createCanvas, loadImage, registerFont } = require('canvas');
const fetch = require('node-fetch');
const path = require('path');

// Registra a fonte estilo Minecraft
const fontPath = path.join(__dirname, '../assets/fonts/minecraft_font.ttf');
registerFont(fontPath, { family: 'MinecraftFont' });

// Função para desenhar moldura estilo Minecraft com 9-slice
async function drawMinecraftStyleBox(ctx, image, x, y, width, height, sliceSize = 8) {
    const iw = image.width;
    const ih = image.height;

    ctx.drawImage(image, 0, 0, sliceSize, sliceSize, x, y, sliceSize, sliceSize);
    ctx.drawImage(image, sliceSize, 0, iw - 2 * sliceSize, sliceSize, x + sliceSize, y, width - 2 * sliceSize, sliceSize);
    ctx.drawImage(image, iw - sliceSize, 0, sliceSize, sliceSize, x + width - sliceSize, y, sliceSize, sliceSize);

    ctx.drawImage(image, 0, sliceSize, sliceSize, ih - 2 * sliceSize, x, y + sliceSize, sliceSize, height - 2 * sliceSize);
    ctx.drawImage(image, sliceSize, sliceSize, iw - 2 * sliceSize, ih - 2 * sliceSize, x + sliceSize, y + sliceSize, width - 2 * sliceSize, height - 2 * sliceSize);
    ctx.drawImage(image, iw - sliceSize, sliceSize, sliceSize, ih - 2 * sliceSize, x + width - sliceSize, y + sliceSize, sliceSize, height - 2 * sliceSize);

    ctx.drawImage(image, 0, ih - sliceSize, sliceSize, sliceSize, x, y + height - sliceSize, sliceSize, sliceSize);
    ctx.drawImage(image, sliceSize, ih - sliceSize, iw - 2 * sliceSize, sliceSize, x + sliceSize, y + height - sliceSize, width - 2 * sliceSize, sliceSize);
    ctx.drawImage(image, iw - sliceSize, ih - sliceSize, sliceSize, sliceSize, x + width - sliceSize, y + height - sliceSize, sliceSize, sliceSize);
}

module.exports = async (client, topUsers) => {
    const canvasWidth = 800;
    const userEntryHeight = 80;
    const padding = 10;
    const titleHeight = 80;
    const headerHeight = 50;

    const fixedTopUsers = 5;
    const bottomPadding = 20; // Espaçamento extra no final
    const totalContentHeight = (fixedTopUsers * (userEntryHeight + padding)) - padding;
    const canvasHeight = titleHeight + headerHeight + totalContentHeight + padding + bottomPadding;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Carrega fundo e moldura
    const backgroundImagePath = path.join(__dirname, '../assets/images/bg_topmoney.jpeg');
    const pixelFramePath = path.join(__dirname, '../assets/images/minecraft_frame_pixel.png');

    const backgroundImage = await loadImage(backgroundImagePath);
    const pixelFrameImage = await loadImage(pixelFramePath);

    ctx.filter = 'blur(8px)';
    
    const canvasAspectRatio = canvasWidth / canvasHeight;
    const imageAspectRatio = backgroundImage.width / backgroundImage.height;
    
    let renderableWidth, renderableHeight, xStart, yStart;

    if (imageAspectRatio > canvasAspectRatio) {
        renderableHeight = canvasHeight;
        renderableWidth = backgroundImage.width * (renderableHeight / backgroundImage.height);
        xStart = (canvasWidth - renderableWidth) / 2;
        yStart = 0;
    } else {
        renderableWidth = canvasWidth;
        renderableHeight = backgroundImage.height * (renderableWidth / backgroundImage.width);
        xStart = 0;
        yStart = (canvasHeight - renderableHeight) / 2;
    }
    ctx.drawImage(backgroundImage, xStart, yStart, renderableWidth, renderableHeight);
    ctx.filter = 'none';

    // Título
    ctx.font = '50px "MinecraftFont", "Segoe UI", Arial'; 
    ctx.fillStyle = '#F0F0F0';
    ctx.textAlign = 'center';
    const titleTextMetrics = ctx.measureText('TOP MONEY');
    const titleY = 45;
    ctx.fillText('TOP MONEY', canvasWidth / 2, titleY + (titleTextMetrics.actualBoundingBoxAscent / 2) - (titleTextMetrics.actualBoundingBoxDescent / 2)); 

    // Layout
    const tableX = 40;
    const tableWidth = canvasWidth - (tableX * 2);
    const gapBetweenCells = 8;

    const cellRankWidth = 80;
    const cellEmeraldsWidth = 200;
    const cellUserAvatarWidth = tableWidth - cellRankWidth - cellEmeraldsWidth - (gapBetweenCells * 2);

    // Header
    const headerY = titleHeight + padding;
    await drawMinecraftStyleBox(ctx, pixelFrameImage, tableX, headerY, tableWidth, headerHeight);

    ctx.font = '25px "MinecraftFont", "Segoe UI", Arial';
    ctx.fillStyle = '#F0F0F0';
    ctx.textAlign = 'center';

    const headerTextBaseY = headerY + headerHeight / 2;
    ctx.fillText('N°', tableX + cellRankWidth / 2, headerTextBaseY + 10);
    ctx.fillText('Usuario', tableX + cellRankWidth + gapBetweenCells + cellUserAvatarWidth / 2, headerTextBaseY + 10);
    ctx.fillText('Esmeraldas', tableX + cellRankWidth + gapBetweenCells + cellUserAvatarWidth + gapBetweenCells + cellEmeraldsWidth / 2, headerTextBaseY + 10);

    let yOffset = headerY + headerHeight + padding;

    for (let i = 0; i < fixedTopUsers; i++) {
        const userEconomy = topUsers[i];
        let user;

        if (userEconomy) {
            try {
                user = await client.users.fetch(userEconomy.userId).catch(() => null);
            } catch {
                user = null;
            }
        }

        const username = user ? (user.username || 'Usuario Desconhecido') : '---';
        const emeraldsFormatted = userEconomy ? userEconomy.emeralds.toLocaleString('pt-BR') : '---';

        let rankColor;
        switch (i) {
            case 0: rankColor = '#FFD700'; break;
            case 1: rankColor = '#C0C0C0'; break;
            case 2: rankColor = '#CD7F32'; break;
            default: rankColor = '#F0F0F0'; break;
        }

        // Rank Box
        const rankX = tableX;
        const rankY = yOffset;
        await drawMinecraftStyleBox(ctx, pixelFrameImage, rankX, rankY, cellRankWidth, userEntryHeight);
        ctx.font = '30px "MinecraftFont", "Segoe UI", Arial';
        ctx.fillStyle = rankColor;
        ctx.textAlign = 'center';
        ctx.fillText(`${i + 1}.`, rankX + cellRankWidth / 2, rankY + userEntryHeight / 2 + 10);

        // Avatar/User
        const userX = rankX + cellRankWidth + gapBetweenCells;
        const userY = yOffset;
        await drawMinecraftStyleBox(ctx, pixelFrameImage, userX, userY, cellUserAvatarWidth, userEntryHeight);

        const avatarSize = 50;
        const avatarX = userX + padding;
        const avatarY = userY + (userEntryHeight - avatarSize) / 2;

        if (user) {
            try {
                const avatarURL = user.displayAvatarURL({ extension: 'png', size: 128 });
                const avatar = await loadImage(avatarURL);
                ctx.save();
                ctx.beginPath();
                ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
                ctx.restore();
            } catch {
                // Fallback for user without avatar
                ctx.beginPath();
                ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.fillStyle = '#7289DA';
                ctx.fill();
            }
        } else {
            // Placeholder for empty slot
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.fillStyle = '#404040'; // Dark gray for empty slot
            ctx.fill();
        }

        ctx.font = '25px "MinecraftFont", "Segoe UI", Arial';
        ctx.fillStyle = '#F0F0F0';
        ctx.textAlign = 'left';
        ctx.fillText(username, avatarX + avatarSize + padding, userY + userEntryHeight / 2 + 10);

        // Emeralds
        const emeraldsX = userX + cellUserAvatarWidth + gapBetweenCells;
        const emeraldsY = yOffset;
        await drawMinecraftStyleBox(ctx, pixelFrameImage, emeraldsX, emeraldsY, cellEmeraldsWidth, userEntryHeight);

        ctx.font = '28px "MinecraftFont", "Segoe UI", Arial';
        ctx.fillStyle = '#F0F0F0';
        ctx.textAlign = 'center';
        ctx.fillText(emeraldsFormatted, emeraldsX + cellEmeraldsWidth / 2, emeraldsY + userEntryHeight / 2 + 10);

        yOffset += userEntryHeight + padding;
    }

    return canvas.toBuffer();
};

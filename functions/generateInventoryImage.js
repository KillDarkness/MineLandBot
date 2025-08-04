const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const items = require('../assets/items.json');

const fontPath = path.join(__dirname, '../assets/fonts/minecraft_font.ttf');
registerFont(fontPath, { family: 'MinecraftFont' });

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

module.exports = async (userInventory) => {
    const canvasWidth = 800;
    const canvasHeight = 400;
    const padding = 15;
    const titleHeight = 60;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    const backgroundImagePath = path.join(__dirname, '../assets/images/bg_topmoney.jpeg');
    const pixelFramePath = path.join(__dirname, '../assets/images/minecraft_frame_pixel.png');

    const backgroundImage = await loadImage(backgroundImagePath);
    const pixelFrameImage = await loadImage(pixelFramePath);

    ctx.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight);

    ctx.font = '40px "MinecraftFont"';
    ctx.fillStyle = '#F0F0F0';
    ctx.textAlign = 'center';
    ctx.fillText('Inventário', canvasWidth / 2, titleHeight);

    const boxWidth = (canvasWidth - 5 * padding) / 4;
    const boxHeight = (canvasHeight - titleHeight - 3 * padding) / 2;

    for (let i = 0; i < 8; i++) {
        const boxX = padding + (i % 4) * (boxWidth + padding);
        const boxY = titleHeight + padding + Math.floor(i / 4) * (boxHeight + padding);
        await drawMinecraftStyleBox(ctx, pixelFrameImage, boxX, boxY, boxWidth, boxHeight);

        const inventoryItem = userInventory[i];
        if (inventoryItem) {
            const item = items.find(it => it.id === inventoryItem.itemId);
            if (item) {
                ctx.font = '20px "MinecraftFont"';
                ctx.fillStyle = '#FFFFFF';
                ctx.textAlign = 'center';
                ctx.fillText(item.name, boxX + boxWidth / 2, boxY + boxHeight / 2);

                ctx.font = '18px "MinecraftFont"';
                ctx.fillStyle = '#FFFF00';
                ctx.textAlign = 'right';
                ctx.fillText(`x${inventoryItem.quantity}`, boxX + boxWidth - 15, boxY + boxHeight - 15);
            }
        } else {
            ctx.font = '20px "MinecraftFont"';
            ctx.fillStyle = '#A9A9A9';
            ctx.textAlign = 'center';
            ctx.fillText('Vazio', boxX + boxWidth / 2, boxY + boxHeight / 2);
        }
    }

    return canvas.toBuffer();
};
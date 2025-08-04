const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const items = require('../assets/items.json');
const ms = require('ms');

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

function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            context.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        }
        else {
            line = testLine;
        }
    }
    context.fillText(line, x, y);
}

module.exports = async (userArtifacts) => {
    const canvasWidth = 800;
    const canvasHeight = 450; // Reduced height
    const padding = 20;
    const titleHeight = 60;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    const backgroundImagePath = path.join(__dirname, '../assets/images/theend_bg.png');
    const pixelFramePath = path.join(__dirname, '../assets/images/minecraft_frame_pixel.png');

    const backgroundImage = await loadImage(backgroundImagePath);
    const pixelFrameImage = await loadImage(pixelFramePath);

    ctx.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight);

    ctx.font = '40px "MinecraftFont"';
    ctx.fillStyle = '#F0F0F0';
    ctx.textAlign = 'center';
    ctx.fillText('Artefatos Equipados', canvasWidth / 2, titleHeight);

    const boxWidth = (canvasWidth - 3 * padding) / 2;
    const boxHeight = (canvasHeight - titleHeight - 3 * padding) / 2;

    for (let i = 0; i < 4; i++) {
        const boxX = padding + (i % 2) * (boxWidth + padding);
        const boxY = titleHeight + padding + Math.floor(i / 2) * (boxHeight + padding);
        await drawMinecraftStyleBox(ctx, pixelFrameImage, boxX, boxY, boxWidth, boxHeight);

        const artifact = userArtifacts[i];
        if (artifact) {
            const item = items.find(it => it.id === artifact.artifactId);
            if (item) {
                ctx.font = '24px "MinecraftFont"';
                ctx.fillStyle = '#FFD700';
                ctx.textAlign = 'center';
                const displayName = item.name.replace('Artefato ', '');
                ctx.fillText(displayName, boxX + boxWidth / 2, boxY + 45);

                ctx.font = '16px "MinecraftFont"';
                ctx.fillStyle = '#E0E0E0';
                wrapText(ctx, item.description, boxX + boxWidth / 2, boxY + 80, boxWidth - 30, 20);

                const duration = artifact.expiresAt ? `Expira em ${ms(artifact.expiresAt.getTime() - Date.now(), { long: true }).replace('days', 'dias').replace('day', 'dia').replace('hours', 'horas').replace('hour', 'hora').replace('minutes', 'minutos').replace('minute', 'minuto').replace('seconds', 'segundos').replace('second', 'segundo')}` : 'Permanente';
                ctx.font = '18px "MinecraftFont"';
                ctx.fillStyle = '#87CEEB';
                ctx.fillText(duration, boxX + boxWidth / 2, boxY + boxHeight - 30);
            }
        } else {
            ctx.font = '24px "MinecraftFont"';
            ctx.fillStyle = '#A9A9A9';
            ctx.textAlign = 'center';
            ctx.fillText('Slot Vazio', boxX + boxWidth / 2, boxY + boxHeight / 2);
        }
    }

    return canvas.toBuffer();
};
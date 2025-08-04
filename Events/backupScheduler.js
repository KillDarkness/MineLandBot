const cron = require('node-cron');
const BackupConfig = require('../MongoDB/Models/BackupConfig');
const createBackup = require('../functions/backup/createBackup');
const { Client } = require('discord.js');

/**
 * @param {Client} client
 */
function initializeBackupScheduler(client) {
    // Executa a verificação a cada hora
    cron.schedule('0 * * * *', async () => {
        console.log('💫 » Verificando backups agendados...');
        try {
            const configs = await BackupConfig.find({ isEnabled: true });

            for (const config of configs) {
                const now = new Date();
                const lastBackup = config.lastBackupAt || new Date(0); // Se nunca houve backup, considera uma data muito antiga
                const intervalMs = config.interval * 24 * 60 * 60 * 1000; // Intervalo em milissegundos (convertido de dias)

                if (now.getTime() - lastBackup.getTime() >= intervalMs) {
                    const guild = client.guilds.cache.get(config.guildId);
                    if (guild) {
                        const { success, backupId, error } = await createBackup(guild, config.channelsToBackup);
                        
                        if (success) {
                            await BackupConfig.updateOne({ guildId: guild.id }, { $set: { lastBackupAt: new Date() } });
                        } else {
                            console.error(`[Backup] Falha ao fazer backup de ${guild.name}: ${error}`);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[Backup Scheduler] Erro ao executar o agendador de backup:', error);
        }
    });
}

module.exports = initializeBackupScheduler;

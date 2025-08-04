const Artifacts = require('../MongoDB/Models/Artifacts');

async function checkArtifacts(client) {
    console.log('🔍 » Verificando artefatos ativos...');
    const activeArtifacts = await Artifacts.find({ 'artifacts.expiresAt': { $ne: null } });

    if (activeArtifacts.length === 0) {
        return;
    }

    console.log(`📋 » Encontrados ${activeArtifacts.length} usuários com artefatos ativos para verificar.`);

    const now = new Date();

    for (const userArtifacts of activeArtifacts) {
        for (const artifact of userArtifacts.artifacts) {
            if (artifact.expiresAt && artifact.expiresAt <= now) {
                await removeExpiredArtifact(userArtifacts.userId, artifact.artifactId);
            } else if (artifact.expiresAt) {
                const timeLeft = artifact.expiresAt.getTime() - now.getTime();
                scheduleArtifactRemoval(userArtifacts.userId, artifact.artifactId, timeLeft);
            }
        }
    }
}

async function removeExpiredArtifact(userId, artifactId) {
    try {
        await Artifacts.updateOne({ userId }, { $pull: { artifacts: { artifactId } } });
        console.log(`✅ » Artefato ${artifactId} expirado e removido para o usuário ${userId}`);
    } catch (error) {
        console.error(`❌ » Erro ao remover artefato expirado para o usuário ${userId}:`, error);
    }
}

function scheduleArtifactRemoval(userId, artifactId, timeLeft) {
    const maxTimeout = 2147483647;

    if (timeLeft > maxTimeout) {
        setTimeout(() => {
            checkSpecificArtifact(userId, artifactId);
        }, 24 * 60 * 60 * 1000); // 24 hours
        return;
    }

    setTimeout(async () => {
        await removeExpiredArtifact(userId, artifactId);
    }, timeLeft);
}

async function checkSpecificArtifact(userId, artifactId) {
    try {
        const userArtifacts = await Artifacts.findOne({ userId, 'artifacts.artifactId': artifactId });
        if (!userArtifacts) {
            return;
        }

        const artifact = userArtifacts.artifacts.find(a => a.artifactId === artifactId);
        if (!artifact || !artifact.expiresAt) {
            return;
        }

        const now = new Date();
        if (artifact.expiresAt <= now) {
            await removeExpiredArtifact(userId, artifactId);
        } else {
            const timeLeft = artifact.expiresAt.getTime() - now.getTime();
            scheduleArtifactRemoval(userId, artifactId, timeLeft);
        }
    } catch (error) {
        console.error(`❌ » Erro ao verificar artefato específico para o usuário ${userId}:`, error);
    }
}

module.exports = { checkArtifacts };
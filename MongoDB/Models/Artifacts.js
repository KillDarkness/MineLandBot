const mongoose = require('mongoose');

const ArtifactSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    artifacts: [
        {
            artifactId: { type: String, required: true },
            expiresAt: { type: Date, default: null },
        },
    ],
});

const Artifacts = mongoose.model('Artifacts', ArtifactSchema);

module.exports = Artifacts;
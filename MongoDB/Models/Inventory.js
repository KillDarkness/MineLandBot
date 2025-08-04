const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    items: [
        {
            itemId: { type: String, required: true },
            quantity: { type: Number, required: true, default: 1 },
            duration: { type: String, default: null },
        },
    ],
});

const Inventory = mongoose.model('Inventory', InventorySchema);

module.exports = Inventory;
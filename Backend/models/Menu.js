const mongoose = require('mongoose');

const MenuSchema = new mongoose.Schema({
    dining_court: { type: String, required: true },
    station: { type: String, required: true },
    item_name: { type: String, required: true },
    meal_period: { type: String, required: true },
    date: { type: Date, required: true }
});

// Add case-insensitive index for item names
MenuSchema.index({ item_name: 1, dining_court: 1 });
MenuSchema.index({ date: 1 });

module.exports = mongoose.model('Menu', MenuSchema);

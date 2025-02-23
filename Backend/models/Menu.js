const mongoose = require('mongoose');

const MenuSchema = new mongoose.Schema({
    dining_court: { type: String, required: true },
    station: { type: String, required: true },
    item_name: { type: String, required: true },
    meal_period: { type: String, required: true },
    date: { type: Date, required: true },
    dietary_tags: [String],
    nutrition_link: String,
    timestamp: { type: Date, default: Date.now }
});

// Add indexes for common queries
MenuSchema.index({ date: 1, meal_period: 1 });
MenuSchema.index({ dining_court: 1 });

module.exports = mongoose.model('Menu', MenuSchema);

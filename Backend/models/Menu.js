const mongoose = require('mongoose');

const NutritionSchema = new mongoose.Schema({
    calories: { type: Number, required: false }
});

const MenuItemSchema = new mongoose.Schema({
    item_name: { type: String, required: true },
    dietary_tags: [{ type: String, required: false }],
    nutrition: { type: NutritionSchema, required: false }
});

const StationSchema = new mongoose.Schema({
    station: { type: String, required: true },
    items: [MenuItemSchema]
});

const MenuSchema = new mongoose.Schema({
    dining_court: { type: String, required: true },
    date: { type: String, required: true },
    meal: { type: String, required: true },
    stations: [StationSchema]
});

module.exports = mongoose.model('Menu', MenuSchema);

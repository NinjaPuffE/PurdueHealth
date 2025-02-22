const express = require('express');
const router = express.Router();
const menuCollection = require('../models/Menu');
const nutritionCollection = require('../models/Nutrition');
const { checkJwt, requireEmail } = require('../middleware/auth');

// Get menu items for a specific dining court, date, and meal
router.get('/', checkJwt, async (req, res) => {
    try {
        const { dining_court, date, meal } = req.query;

        if (!dining_court || !date || !meal) {
            return res.status(400).json({ message: 'Missing required query parameters' });
        }

        const menuItems = await menuCollection.aggregate([
            { $match: { dining_court, date } },
            { $group: {
                _id: '$station',
                items: { $push: {
                    item_name: '$item_name',
                    dietary_tags: '$dietary_tags',
                    nutrition_link: '$nutrition_link'
                }}
            }}
        ]).toArray();

        // Fetch nutrition info for menu items
        for (const station of menuItems) {
            for (const item of station.items) {
                const nutrition = await nutritionCollection.findOne({ item_name: item.item_name });
                if (nutrition) {
                    item.nutrition = nutrition;
                }
            }
        }

        res.json(menuItems);
    } catch (error) {
        console.error('Failed to fetch menu data:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

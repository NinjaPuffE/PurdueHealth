const express = require('express');
const router = express.Router();
const { checkJwt, requireEmail } = require('../middleware/auth');
const User = require('../models/Users');
const { MongoClient } = require('mongodb');

// Get user's favorites
router.get('/:userId', checkJwt, requireEmail, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.favorites || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Get food locations from menu collection
router.get('/food-locations/:itemName', checkJwt, requireEmail, async (req, res) => {
  try {
    const { itemName } = req.params;
    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db(process.env.DATABASE_NAME);
    const menuCollection = db.collection(process.env.MENUS_COLLECTION_NAME);

    // Get all future dates where this item appears
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const locations = await menuCollection.distinct('dining_court', {
      item_name: { $regex: new RegExp(`^${itemName}$`, 'i') }, // Case-insensitive exact match
      date: { $gte: today }
    });

    console.log(`Found locations for ${itemName}:`, locations);

    // Get all historical locations as well
    const historicalLocations = await menuCollection.distinct('dining_court', {
      item_name: { $regex: new RegExp(`^${itemName}$`, 'i') }
    });

    // Combine and deduplicate locations
    const allLocations = [...new Set([...locations, ...historicalLocations])];

    // For debugging
    console.log(`Historical locations for ${itemName}:`, historicalLocations);
    console.log(`Combined unique locations for ${itemName}:`, allLocations);

    res.json(allLocations.length > 0 ? allLocations : ['Not currently served']);
  } catch (error) {
    console.error('Food locations error:', error);
    res.status(500).json({ error: 'Failed to find food locations' });
  }
});

// Add to favorites with locations
router.post('/add', checkJwt, requireEmail, async (req, res) => {
  try {
    const { foodItem } = req.body;
    const user = await User.findOne({ email: req.user.email });

    if (user.favorites?.length >= 20) {
      return res.status(400).json({ error: 'Maximum favorites limit reached (20)' });
    }

    if (user.favorites?.some(item => item.name === foodItem.name)) {
      return res.status(400).json({ error: 'Item already in favorites' });
    }

    // Get current locations
    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db(process.env.DATABASE_NAME);
    const menuCollection = db.collection(process.env.MENUS_COLLECTION_NAME);
    const nutritionCollection = db.collection(process.env.NUT_COLLECTION_NAME);

    const today = new Date().toISOString().split('T')[0];
    
    const locations = await menuCollection.distinct('dining_court', {
      item_name: foodItem.name,
      date: today
    });

    // Get nutrition info
    const nutrition = await nutritionCollection.findOne({ item_name: foodItem.name });

    const favoriteItem = {
      ...foodItem,
      diningCourts: locations.length > 0 ? locations : ['Not currently served'],
      nutrition: nutrition || {
        calories: foodItem.calories,
        protein: foodItem.protein,
        carbs: foodItem.carbs,
        fat: foodItem.fat
      }
    };

    user.favorites = [...(user.favorites || []), favoriteItem];
    await user.save();

    res.json(user.favorites);
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// Remove from favorites
router.delete('/:foodName', checkJwt, requireEmail, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    user.favorites = user.favorites.filter(item => 
      item.name !== req.params.foodName
    );
    await user.save();
    res.json(user.favorites);
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

module.exports = router;
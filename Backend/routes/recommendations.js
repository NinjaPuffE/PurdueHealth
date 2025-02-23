const express = require('express');
const router = express.Router();
const { checkJwt, requireEmail } = require('../middleware/auth');
const User = require('../models/Users');
const Menu = require('../models/Menu');
const MealGroup = require('../models/MealGroup');
const { MongoClient } = require('mongodb');

// Debug route for menu data
router.get('/debug-menu', checkJwt, requireEmail, async (req, res) => {
  try {
    const { mealPeriod, date } = getNextMealPeriod();
    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);

    const menuItems = await Menu.find({
      date: {
        $gte: queryDate,
        $lt: new Date(queryDate.getTime() + 24 * 60 * 60 * 1000)
      },
      meal_period: mealPeriod
    }).lean();

    res.json({
      currentTime: new Date(),
      mealPeriod,
      queryDate,
      totalItems: menuItems.length,
      itemsByDiningCourt: menuItems.reduce((acc, item) => {
        if (!acc[item.dining_court]) acc[item.dining_court] = 0;
        acc[item.dining_court]++;
        return acc;
      }, {}),
      sampleItems: menuItems.slice(0, 5)
    });
  } catch (error) {
    console.error('Debug menu error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/debug-data', checkJwt, requireEmail, async (req, res) => {
  try {
    const stats = {
      totalMenuItems: await Menu.countDocuments({}),
      distinctDates: await Menu.distinct('date'),
      distinctTimeslots: await Menu.distinct('timeslot'),
      sampleItems: await Menu.find({}).limit(5).lean()
    };

    res.json(stats);
  } catch (error) {
    console.error('Debug data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update the /dining route
router.post('/dining', checkJwt, requireEmail, async (req, res) => {
  try {
    const { userId, groupId, mealPeriod, date } = req.body;

    console.log('Raw request data:', { userId, groupId, mealPeriod, date });

    // Get user(s) favorites
    let userFavorites = [];
    if (groupId) {
      const group = await MealGroup.findById(groupId);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
      const members = await User.find({ email: { $in: group.members } });
      userFavorites = members.reduce((acc, member) => [
        ...acc,
        ...(member.favorites || [])
      ], []);
    } else {
      const user = await User.findOne({ email: userId });
      // Filter out any undefined or invalid favorites
      userFavorites = (user.favorites || []).filter(fav => fav && fav.name);
    }

    // Debug log favorites
    console.log('User favorites:', userFavorites.map(f => f?.name).filter(Boolean));

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db(process.env.DATABASE_NAME);
    const menuCollection = db.collection(process.env.MENUS_COLLECTION_NAME);

    const menuItems = await menuCollection.find({
      dining_court: { $exists: true },
      date: date,
      timeslot: mealPeriod
    }).toArray();

    console.log('Menu query:', {
      date,
      timeslot: mealPeriod,
      itemsFound: menuItems.length,
      sampleItems: menuItems.slice(0, 2).map(item => ({
        name: item.item_name,
        court: item.dining_court
      }))
    });

    if (!menuItems || menuItems.length === 0) {
      return res.json({
        message: 'No menu data available for the selected period',
        error: true
      });
    }

    const courtMenus = menuItems.reduce((acc, item) => {
      if (!acc[item.dining_court]) {
        acc[item.dining_court] = [];
      }
      acc[item.dining_court].push(item);
      return acc;
    }, {});

    const scores = Object.entries(courtMenus).map(([court, items]) => {
      const matchingItems = items.filter(item => {
        return userFavorites.some(fav => {
          if (!fav || !fav.name || !item.item_name) return false;
          const itemName = item.item_name.toLowerCase();
          const favName = fav.name.toLowerCase();
          return itemName.includes(favName) || favName.includes(itemName);
        });
      });

      const confidence = userFavorites.length > 0 
        ? (matchingItems.length / userFavorites.length) * 100 
        : 0;

      return {
        diningCourt: court,
        confidence: Math.round(confidence),
        matchingItems: matchingItems.map(item => ({
          name: item.item_name,
          matchedPreference: userFavorites.find(fav => 
            fav && fav.name && item.item_name &&
            item.item_name.toLowerCase().includes(fav.name.toLowerCase())
          )?.name
        })).filter(item => item.matchedPreference), // Filter out items without matches
        isOpen: true
      };
    });

    // Sort by confidence score in descending order
    const sortedScores = scores.sort((a, b) => b.confidence - a.confidence);
    const bestOption = sortedScores[0];

    console.log('Final recommendation:', bestOption);
    res.json(bestOption);

  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate recommendation', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

function getNextMealPeriod() {
  const now = new Date();
  const hour = now.getHours();
  const currentDate = now.toISOString().split('T')[0];
  let nextDate = currentDate;
  let mealPeriod;

  // Define meal periods
  if (hour >= 0 && hour < 7) {
    mealPeriod = 'Breakfast';
  } else if (hour >= 7 && hour < 10) {
    mealPeriod = 'Breakfast';
  } else if (hour >= 10 && hour < 14) {
    mealPeriod = 'Lunch';
  } else if (hour >= 14 && hour < 17) {
    mealPeriod = 'Dinner';
  } else if (hour >= 17 && hour < 21) {
    mealPeriod = 'Dinner';
  } else {
    // After 9 PM, get tomorrow's breakfast
    mealPeriod = 'Breakfast';
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    nextDate = tomorrow.toISOString().split('T')[0];
  }

  return { mealPeriod, date: nextDate };
}

module.exports = router;
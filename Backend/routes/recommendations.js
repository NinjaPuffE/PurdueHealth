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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const sample = await Menu.findOne({ 
            date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
        });
        
        res.json({
            sample,
            hasData: !!sample,
            date: today,
            query: {
                date: {
                    $gte: today,
                    $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
                }
            }
        });
    } catch (error) {
        console.error('Debug menu error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/dining', checkJwt, requireEmail, async (req, res) => {
  try {
    const { userId, groupId } = req.body;
    
    // Get next meal period info
    const { mealPeriod, date } = getNextMealPeriod();

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
      userFavorites = user.favorites || [];
    }

    // Get menu items from MongoDB
    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db(process.env.DATABASE_NAME);
    const menuCollection = db.collection(process.env.MENUS_COLLECTION_NAME);

    // Find menu items for the current/next meal period
    const menuItems = await menuCollection.find({
      date: new Date(date),
      meal_period: mealPeriod
    }).toArray();

    console.log(`Found ${menuItems.length} menu items for ${mealPeriod} on ${date}`);

    if (!menuItems.length) {
      const diningCourts = ['Hillenbrand', 'Earhart', 'Ford', 'Wiley', 'Windsor'];
      const randomCourt = diningCourts[Math.floor(Math.random() * diningCourts.length)];
      return res.json({
        diningCourt: randomCourt,
        confidence: 0,
        matchingItems: [],
        message: 'No menu data available, random selection made'
      });
    }

    // Group items by dining court
    const courtMenus = menuItems.reduce((acc, item) => {
      if (!acc[item.dining_court]) {
        acc[item.dining_court] = [];
      }
      acc[item.dining_court].push(item);
      return acc;
    }, {});

    // Calculate scores for each dining court
    const scores = Object.entries(courtMenus).map(([court, items]) => {
      const matchingItems = items.filter(item => {
        return userFavorites.some(fav => {
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
            item.item_name.toLowerCase().includes(fav.name.toLowerCase())
          )?.name
        })),
        isOpen: items.length > 0
      };
    });

    // Get the best recommendation from open dining courts
    const openCourts = scores.filter(score => score.isOpen);
    if (!openCourts.length) {
      const diningCourts = ['Hillenbrand', 'Earhart', 'Ford', 'Wiley', 'Windsor'];
      const randomCourt = diningCourts[Math.floor(Math.random() * diningCourts.length)];
      return res.json({
        diningCourt: randomCourt,
        confidence: 0,
        matchingItems: [],
        message: 'No dining courts open, random selection made'
      });
    }

    const bestOption = openCourts.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    , openCourts[0]);

    res.json(bestOption);

  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ error: 'Failed to generate recommendation' });
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
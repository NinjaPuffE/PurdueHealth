const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const { checkJwt, requireEmail, handlePreflightRequest } = require('../middleware/auth');
require('dotenv').config();

let mongoClient = null;

const getMongoClient = async () => {
  if (!mongoClient) {
    mongoClient = new MongoClient(process.env.MONGO_URI);
    await mongoClient.connect();
  }
  return mongoClient;
};

router.use(handlePreflightRequest);

// Add this new test route at the beginning of your routes
router.get('/test-connection', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const stats = {};

    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      stats[collection.name] = count;
    }

    res.json({
      message: 'Database connection test',
      databaseName: db.databaseName,
      collections: stats
    });

  } catch (error) {
    console.error('Connection test error:', error);
    res.status(500).json({
      message: 'Connection test failed',
      error: error.message
    });
  }
});

// Search Purdue dining foods
router.get('/foods', checkJwt, requireEmail, async (req, res) => {
  try {
    const { search } = req.query;
    console.log('Searching foods by item_name:', search);

    if (!search || search.length < 2) {
      return res.json([]);
    }

    const client = await getMongoClient();
    const db = client.db(process.env.DATABASE_NAME);
    const collection = db.collection(process.env.NUT_COLLECTION_NAME);

    // Debug info
    console.log('Database:', process.env.DATABASE_NAME);
    console.log('Collection:', process.env.NUT_COLLECTION_NAME);

    // Perform search
    const foods = await collection
      .find({
        item_name: {
          $regex: search,
          $options: 'i'
        }
      })
      .limit(20)
      .toArray();

    console.log(`Found ${foods.length} items matching "${search}"`);

    // Transform results
    const transformedFoods = foods.map(food => ({
      _id: food._id,
      name: food.item_name,
      calories: parseNutritionValue(food.calories),
      protein: parseNutritionValue(food.protein),
      carbs: parseNutritionValue(food.total_carbohydrate),
      fat: parseNutritionValue(food.total_fat),
      servingSize: food.serving_size || 'N/A',
      details: {
        sugar: food.sugar,
        fiber: food.dietary_fiber
      }
    }));

    res.json(transformedFoods);

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      message: 'Failed to search foods',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// Update the macros route with better survey data handling
router.get('/macros/:userId', checkJwt, requireEmail, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Calculating macros for:', userId);

    const client = await getMongoClient();
    const db = client.db(process.env.DATABASE_NAME);
    const collection = db.collection('surveys');
    
    // Debug survey collection
    const count = await collection.countDocuments();
    console.log(`Total surveys in collection: ${count}`);
    
    // Find user survey with more detailed logging
    const userSurvey = await collection.findOne({ 
      $or: [
        { userId: userId },
        { 'answers.email': userId },
        { email: userId }
      ]
    });

    console.log('Survey search result:', userSurvey);

    if (!userSurvey) {
      console.log('No survey found for user:', userId);
      // Return default values if no survey exists
      return res.json({
        calories: 2000,
        protein: 150,
        fat: 67,
        carbs: 250,
        message: 'Using default values - no survey found'
      });
    }

    // Extract values from survey with proper parsing
    const weight = parseFloat(userSurvey.answers?.weight || userSurvey.weight || 70);
    const heightFeet = parseFloat(userSurvey.answers?.height?.feet || 5);
    const heightInches = parseFloat(userSurvey.answers?.height?.inches || 10);
    const height = (heightFeet * 30.48) + (heightInches * 2.54); // Convert to cm
    const age = parseFloat(userSurvey.answers?.age || userSurvey.age || 25);
    const gender = userSurvey.answers?.gender || userSurvey.gender || 'male';
    const activityLevel = userSurvey.answers?.activityLevel || 'moderate';
    const workoutDays = parseFloat(userSurvey.answers?.workoutDays || 3);

    console.log('Parsed survey data:', {
      weight, height, age, gender, activityLevel, workoutDays
    });

    // Calculate BMR using Mifflin-St Jeor Equation
    let bmr;
    if (gender === 'male') {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }

    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      veryActive: 1.9
    };

    const tdee = bmr * (activityMultipliers[activityLevel] || activityMultipliers.moderate);
    const workoutCalories = workoutDays * 200;
    const totalCalories = Math.round(tdee + workoutCalories);

    const macros = {
      calories: totalCalories,
      protein: Math.round(weight * 2.2), // 1g per lb of bodyweight
      fat: Math.round((totalCalories * 0.25) / 9),
      carbs: Math.round((totalCalories - ((weight * 2.2 * 4) + (totalCalories * 0.25))) / 4)
    };

    console.log('Calculated macros:', macros);
    res.json(macros);

  } catch (error) {
    console.error('Error calculating macros:', error);
    res.status(500).json({ 
      message: 'Failed to calculate macros',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// Debug route to check collection contents
router.get('/debug', checkJwt, requireEmail, async (req, res) => {
  try {
    const collection = mongoose.connection.db.collection('nutrition');
    const stats = {
      count: await collection.countDocuments(),
      sample: await collection.findOne(),
      collections: await mongoose.connection.db.listCollections().toArray()
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add this new route after the existing debug route
router.get('/collections-stats', checkJwt, requireEmail, async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const stats = {};

    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));

    // Get count for each collection
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      stats[collection.name] = {
        count,
        isNutritionCollection: collection.name === process.env.NUT_COLLECTION_NAME
      };
      console.log(`Collection ${collection.name}: ${count} documents`);
    }

    // Special check for nutrition collection
    const nutritionCollection = process.env.NUT_COLLECTION_NAME;
    if (stats[nutritionCollection]) {
      const sample = await db.collection(nutritionCollection).findOne();
      console.log('Sample nutrition document:', JSON.stringify(sample, null, 2));
    }

    res.json({
      message: 'Collection statistics',
      databaseName: db.databaseName,
      nutritionCollectionName: process.env.NUT_COLLECTION_NAME,
      stats
    });

  } catch (error) {
    console.error('Error getting collection stats:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      message: 'Failed to get collection statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// Add this new route after the existing collections-stats route
router.post('/meals', checkJwt, requireEmail, async (req, res) => {
  try {
    const { userId, date, foods, totals } = req.body;

    const client = await getMongoClient();
    const db = client.db(process.env.DATABASE_NAME);
    const collection = db.collection('meals');

    const result = await collection.insertOne({
      userId,
      date,
      foods,
      totals,
      createdAt: new Date()
    });

    res.json({ 
      message: 'Meal saved successfully',
      mealId: result.insertedId 
    });

  } catch (error) {
    console.error('Error saving meal:', error);
    res.status(500).json({ 
      message: 'Failed to save meal',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

const Meal = require('../models/Meals');

// Add this route to get today's meals
router.get('/today-meals/:userId', checkJwt, requireEmail, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get start and end of today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const meals = await Meal.findOne({
      userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (!meals) {
      // Create new meal tracking for today
      const newMeals = await Meal.create({
        userId,
        date: new Date(),
        foods: [],
        dailyTotals: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        }
      });
      return res.json(newMeals);
    }

    res.json(meals);

  } catch (error) {
    console.error('Error fetching today\'s meals:', error);
    res.status(500).json({ 
      message: 'Failed to fetch meals',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// Add this route to add a food to today's meals
router.post('/add-food', checkJwt, requireEmail, async (req, res) => {
  try {
    const { userId, food } = req.body;
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    let todaysMeals = await Meal.findOne({
      userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (!todaysMeals) {
      todaysMeals = await Meal.create({
        userId,
        date: new Date(),
        foods: [],
        dailyTotals: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        }
      });
    }

    // Add the new food
    todaysMeals.foods.push({
      ...food,
      addedAt: new Date()
    });

    // Update daily totals
    todaysMeals.dailyTotals = todaysMeals.foods.reduce((acc, food) => ({
      calories: acc.calories + food.totalCalories,
      protein: acc.protein + food.totalProtein,
      carbs: acc.carbs + food.totalCarbs,
      fat: acc.fat + food.totalFat
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    await todaysMeals.save();
    res.json(todaysMeals);

  } catch (error) {
    console.error('Error adding food:', error);
    res.status(500).json({ 
      message: 'Failed to add food',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// Helper function to parse nutrition values
const parseNutritionValue = (value) => {
  if (!value) return 0;
  const numericValue = value.toString().replace(/[^\d.]/g, '');
  return parseFloat(numericValue) || 0;
};

module.exports = router;
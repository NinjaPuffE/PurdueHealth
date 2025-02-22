const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // Add mongoose import
const { checkJwt, requireEmail } = require('../middleware/auth');
const { getCollection, connectDB } = require('../utils/db');
const { parseNutritionValue } = require('../utils/nutritionParser');
require('dotenv').config();

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

// Calculate macros based on user data
router.get('/macros/:userId', checkJwt, requireEmail, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Calculating macros for:', userId);

    const collection = await getCollection('surveys');
    const userSurvey = await collection.findOne({ userId });

    if (!userSurvey) {
      console.log('No survey found for user:', userId);
      return res.status(404).json({ message: 'Survey data not found' });
    }

    console.log('Found survey data:', userSurvey);

    // Default values if missing
    const weight = userSurvey.weight || 70; // kg
    const height = userSurvey.height || 170; // cm
    const age = userSurvey.age || 25;
    const gender = userSurvey.gender || 'male';
    const activityLevel = userSurvey.activityLevel || 'moderate';
    const workoutDays = userSurvey.workoutDays || 3;

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

    const tdee = bmr * activityMultipliers[activityLevel];
    const workoutCalories = workoutDays * 200;
    const totalCalories = Math.round(tdee + workoutCalories);

    const macros = {
      calories: totalCalories,
      protein: Math.round(weight * 2.2), // 1g per lb
      fat: Math.round((totalCalories * 0.25) / 9),
      carbs: Math.round((totalCalories - ((weight * 2.2 * 4) + (totalCalories * 0.25))) / 4)
    };

    console.log('Calculated macros:', macros);
    res.json(macros);

  } catch (error) {
    console.error('Error calculating macros:', error);
    res.status(500).json({ message: 'Failed to calculate macros' });
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

    // Get collection with correct name
    const collection = await getCollection('surveys');
    
    // Debug: Get total count of documents
    const totalCount = await collection.countDocuments();
    console.log('Total documents in nutritions collection:', totalCount);

    // Debug: Get a few sample documents
    const samples = await collection.find().limit(3).toArray();
    console.log('Sample documents:', JSON.stringify(samples, null, 2));

    // Try different search approaches
    const searchRegex = new RegExp(search, 'i');
    
    // Method 1: Simple regex search
    const foods1 = await collection
      .find({ item_name: searchRegex })
      .limit(20)
      .toArray();
    console.log('Method 1 results:', foods1.length);

    // Method 2: Text search if index exists
    const foods2 = await collection
      .find({ $text: { $search: search } })
      .limit(20)
      .toArray();
    console.log('Method 2 results:', foods2.length);

    // Method 3: Partial word matching
    const foods3 = await collection
      .find({ 
        item_name: { 
          $regex: search.split(' ').map(word => `(?=.*${word})`).join(''), 
          $options: 'i' 
        } 
      })
      .limit(20)
      .toArray();
    console.log('Method 3 results:', foods3.length);

    // Use the results from any method that worked
    const foods = foods1.length ? foods1 : (foods2.length ? foods2 : foods3);

    // Transform results
    const transformedFoods = foods.map(food => ({
      _id: food._id,
      name: food.item_name,
      calories: parseFloat(food.calories?.replace(/[^\d.]/g, '')) || 0,
      protein: parseFloat(food.protein?.replace(/[^\d.]/g, '')) || 0,
      carbs: parseFloat(food.total_carbohydrate?.replace(/[^\d.]/g, '')) || 0,
      fat: parseFloat(food.total_fat?.replace(/[^\d.]/g, '')) || 0,
      servingSize: food.serving_size || 'N/A'
    }));

    console.log('Transformed foods:', transformedFoods);
    res.json(transformedFoods);

  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    res.status(500).json({ 
      message: 'Failed to search foods',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
});

// Debug route to check collection contents
router.get('/debug', checkJwt, requireEmail, async (req, res) => {
  try {
    const collection = mongoose.connection.db.collection('nutritions');
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

module.exports = router;
const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
require('dotenv').config();

router.get('/', async (req, res) => {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db(process.env.DATABASE_NAME);
    const collection = db.collection(process.env.USAGE_COLLECTION_NAME);

    // Get the latest records for each location
    const areas = await collection.aggregate([
      {
        $sort: { 'last_updated': -1 }
      },
      {
        $group: {
          _id: '$location',
          lastRecord: { $first: '$$ROOT' }
        }
      },
      {
        $replaceRoot: { newRoot: '$lastRecord' }
      }
    ]).toArray();

    // Transform data to match frontend expectations
    const transformedAreas = areas.map(area => {
      const capacityMatch = area.capacity.match(/(\d+)\/(\d+) \/\/ (\d+)%/);
      const currentOccupancy = capacityMatch ? parseInt(capacityMatch[1]) : 0;
      const maxCapacity = capacityMatch ? parseInt(capacityMatch[2]) : 0;
      const percentage = capacityMatch ? parseInt(capacityMatch[3]) : 0;

      let congestionLevel = 'Low';
      if (percentage > 80) congestionLevel = 'High';
      else if (percentage > 50) congestionLevel = 'Moderate';

      return {
        name: area.location,
        currentOccupancy,
        maxCapacity,
        occupancyPercentage: percentage,
        congestionLevel,
        lastUpdated: area.last_updated,
        isClosed: area.capacity === 'Closed Now'
      };
    });

    res.json({
      areas: transformedAreas,
      timestamp: new Date().toISOString(),
      status: 'success'
    });

  } catch (error) {
    console.error('Error fetching facility data:', error);
    res.status(500).json({
      error: 'Failed to fetch facility data',
      message: error.message
    });
  } finally {
    await client.close();
  }
});

module.exports = router;
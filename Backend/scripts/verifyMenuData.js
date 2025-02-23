const mongoose = require('mongoose');
require('dotenv').config();
const Menu = require('../models/Menu');

async function verifyMenuData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const menuItems = await Menu.find({
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });

    console.log('Menu Data Status:');
    console.log(`Total items for today: ${menuItems.length}`);
    
    const byDiningCourt = menuItems.reduce((acc, item) => {
      if (!acc[item.dining_court]) acc[item.dining_court] = 0;
      acc[item.dining_court]++;
      return acc;
    }, {});

    console.log('\nItems by Dining Court:');
    Object.entries(byDiningCourt).forEach(([court, count]) => {
      console.log(`${court}: ${count} items`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Verification error:', error);
    process.exit(1);
  }
}

verifyMenuData();
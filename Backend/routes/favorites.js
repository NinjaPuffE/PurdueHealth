const express = require('express');
const router = express.Router();
const { checkJwt, requireEmail } = require('../middleware/auth');
const User = require('../models/Users');

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

// Add to favorites
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

    user.favorites = [...(user.favorites || []), foodItem];
    await user.save();

    res.json(user.favorites);
  } catch (error) {
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
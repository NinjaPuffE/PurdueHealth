const express = require('express');
const router = express.Router();
const { checkJwt, requireEmail } = require('../middleware/auth');
const User = require('../models/Users');
const MealGroup = require('../models/MealGroup');

// Search users
router.get('/search', checkJwt, requireEmail, async (req, res) => {
  try {
    const { term } = req.query;
    const users = await User.find({
      $or: [
        { email: { $regex: term, $options: 'i' } },
        { username: { $regex: term, $options: 'i' } }
      ],
      email: { $ne: req.user.email }
    }).select('email username name picture').limit(10);
    
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Get friends list
router.get('/friends/:userId', checkJwt, requireEmail, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.userId });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const friends = await User.find({ email: { $in: user.friends } })
      .select('email username name picture');
    
    res.json(friends);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// Add friend
router.post('/friends/add', checkJwt, requireEmail, async (req, res) => {
  try {
    const { friendId } = req.body;
    const user = await User.findOne({ email: req.user.email });
    const friend = await User.findOne({ email: friendId });

    if (!user || !friend) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.friends.includes(friendId)) {
      user.friends.push(friendId);
      friend.friends.push(user.email);
      await Promise.all([user.save(), friend.save()]);
    }

    res.json({ friend: { email: friend.email, username: friend.username, name: friend.name, picture: friend.picture } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add friend' });
  }
});

// Send friend request
router.post('/friends/request', checkJwt, requireEmail, async (req, res) => {
  try {
    const { friendId } = req.body;
    const user = await User.findOne({ email: req.user.email });
    const friend = await User.findOne({ email: friendId });

    if (!user || !friend) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already friends
    if (user.friends.includes(friendId)) {
      return res.status(400).json({ error: 'Already friends' });
    }

    // Check if request already sent
    if (friend.friendRequests.received.includes(user.email)) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    // Add to friend requests
    friend.friendRequests.received.push(user.email);
    user.friendRequests.sent.push(friendId);
    
    await Promise.all([friend.save(), user.save()]);

    res.json({ 
      message: 'Friend request sent',
      requestedFriend: {
        email: friend.email,
        username: friend.username,
        name: friend.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// Accept friend request
router.post('/friends/accept', checkJwt, requireEmail, async (req, res) => {
  try {
    const { friendId } = req.body;
    const user = await User.findOne({ email: req.user.email });
    const friend = await User.findOne({ email: friendId });

    if (!user || !friend) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove from requests
    user.friendRequests.received = user.friendRequests.received.filter(id => id !== friendId);
    friend.friendRequests.sent = friend.friendRequests.sent.filter(id => id !== user.email);

    // Add as friends
    user.friends.push(friendId);
    friend.friends.push(user.email);

    await Promise.all([user.save(), friend.save()]);

    res.json({ 
      friend: {
        email: friend.email,
        username: friend.username,
        name: friend.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// Get friend requests
router.get('/friend-requests/:userId', checkJwt, requireEmail, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get both sent and received requests
    const receivedRequests = await User.find({ 
      email: { $in: user.friendRequests.received }
    }).select('email username name picture');

    const sentRequests = await User.find({ 
      email: { $in: user.friendRequests.sent } 
    }).select('email username name picture');

    res.json({ 
      received: receivedRequests,
      sent: sentRequests
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch friend requests' });
  }
});

// Get meal groups
router.get('/groups/:userId', checkJwt, requireEmail, async (req, res) => {
  try {
    const groups = await MealGroup.find({ members: req.params.userId });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Create meal group
router.post('/groups/create', checkJwt, requireEmail, async (req, res) => {
  try {
    const { name, members } = req.body;
    
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const group = new MealGroup({
      name,
      creator: req.user.email,
      members: Array.from(new Set([req.user.email, ...(members || [])]))
    });

    await group.save();

    // Update all members' group references
    await User.updateMany(
      { email: { $in: group.members } },
      { $addToSet: { mealGroups: group._id } }
    );

    res.json({ group });
  } catch (error) {
    console.error('Group creation error:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Add members to group
router.post('/groups/:groupId/members', checkJwt, requireEmail, async (req, res) => {
  try {
    const { memberIds } = req.body;
    const { groupId } = req.params;

    const group = await MealGroup.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Verify user is group creator
    if (group.creator !== req.user.email) {
      return res.status(403).json({ error: 'Only group creator can add members' });
    }

    // Add new members
    group.members = Array.from(new Set([...group.members, ...memberIds]));
    await group.save();

    // Update users' group references
    await User.updateMany(
      { email: { $in: memberIds } },
      { $addToSet: { mealGroups: groupId } }
    );

    res.json({ group });
  } catch (error) {
    console.error('Add members error:', error);
    res.status(500).json({ error: 'Failed to add members to group' });
  }
});

module.exports = router;
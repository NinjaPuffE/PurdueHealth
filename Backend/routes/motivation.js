const express = require('express');
const router = express.Router();
const path = require('path');
const { checkJwt, requireEmail } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Generate motivation message
router.post('/generate', checkJwt, requireEmail, async (req, res) => {
  try {
    const { macrosLeft, workoutPlan } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Validate input data
    if (!macrosLeft) {
      return res.status(400).json({ error: 'Missing macros data' });
    }

    // Create motivation prompt
    const prompt = `Create an enthusiastic, motivational message (2-3 sentences) for someone who:
${macrosLeft.calories > 0 ? `- Has ${Math.round(macrosLeft.calories)} calories left to eat today` : '- Has met their calorie goal for today!'}
${macrosLeft.protein > 0 ? `- Needs ${Math.round(macrosLeft.protein)}g more protein` : '- Has hit their protein target!'}
${workoutPlan ? `- Has this workout planned: ${workoutPlan}` : '- Is taking a rest day'}

Make it energetic and encouraging, focusing on their progress and potential. Use a tone similar to Terry Crews' enthusiastic style.`;

    try {
      const result = await model.generateContent(prompt);
      const message = result.response.text();
      res.json({ message });
    } catch (genAIError) {
      console.error('Gemini API error:', genAIError);
      res.status(500).json({ 
        error: 'Failed to generate motivation message',
        details: genAIError.message 
      });
    }

  } catch (error) {
    console.error('Motivation generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve video file
router.get('/video', async (req, res) => {
  try {
    const videoPath = path.join(__dirname, '../components/motivation.mp4');
    
    // Debug log
    console.log('Attempting to serve video from:', videoPath);
    
    if (!fs.existsSync(videoPath)) {
      console.error('Video file not found at:', videoPath);
      return res.status(404).json({ error: 'Video file not found' });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    console.log('Video file size:', fileSize);

    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes'
    });

    const readStream = fs.createReadStream(videoPath);
    readStream.pipe(res);

  } catch (error) {
    console.error('Video serving error:', error);
    res.status(500).json({ error: 'Failed to serve video file' });
  }
});

module.exports = router;
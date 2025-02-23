const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const { checkJwt, requireEmail } = require('../middleware/auth');

router.get('/', checkJwt, requireEmail, async (req, res) => {
  try {
    // Add retries and timeout
    const maxRetries = 3;
    let attempt = 0;
    let response;

    while (attempt < maxRetries) {
      try {
        response = await axios.get('https://www.purdue.edu/recwell/facility-usage/index.php', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          timeout: 5000,
          validateStatus: (status) => status === 200
        });
        break;
      } catch (error) {
        attempt++;
        if (attempt === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    if (!response?.data) {
      throw new Error('No response data received');
    }

    const $ = cheerio.load(response.data);
    const areas = [];

    // Updated selector to match the actual HTML structure
    $('.rw-c2c-feed__location').each((i, elem) => {
      try {
        const $elem = $(elem);
        const name = $elem.find('.rw-c2c-feed__location--name').text().trim();
        const capacityText = $elem.find('.rw-c2c-feed__about--capacity').text().trim();
        const lastUpdated = $elem.find('.rw-c2c-feed__about--update').text()
          .replace('Last Updated:', '').trim();
        
        // Check if location is closed
        const isClosed = $elem.find('.closed').length > 0;
        
        if (isClosed) {
          areas.push({
            name,
            currentOccupancy: 0,
            maxCapacity: 0,
            occupancyPercentage: 0,
            congestionLevel: 'Closed',
            lastUpdated,
            isClosed: true
          });
          return; // Skip rest of processing for closed locations
        }

        // Parse capacity text (format: "Capacity: X/Y // Z%")
        const capacityMatch = capacityText.match(/Capacity: (\d+)\/(\d+) \/\/ (\d+)%/);
        if (!capacityMatch) return;

        const current = parseInt(capacityMatch[1]);
        const max = parseInt(capacityMatch[2]);
        const percentage = parseInt(capacityMatch[3]);

        // Get progress value from aria-valuenow
        const progressValue = parseInt($elem.find('.MuiLinearProgress-root').attr('aria-valuenow'));

        // Determine congestion level
        let congestionLevel = 'Low';
        if (progressValue > 80) {
          congestionLevel = 'High';
        } else if (progressValue > 50) {
          congestionLevel = 'Moderate';
        }

        // Check for special progress classes
        const progressBar = $elem.find('.MuiLinearProgress-root');
        if (progressBar.hasClass('full')) {
          congestionLevel = 'Full';
        } else if (progressBar.hasClass('mid')) {
          congestionLevel = 'Moderate';
        }

        areas.push({
          name,
          currentOccupancy: current,
          maxCapacity: max,
          occupancyPercentage: percentage,
          congestionLevel,
          lastUpdated,
          isClosed: false
        });
      } catch (parseError) {
        console.error(`Error parsing facility area ${elem}: ${parseError}`);
      }
    });

    if (areas.length === 0) {
      console.log('Raw HTML:', response.data);
      throw new Error('No facility data found in the response');
    }

    // Add cache headers but keep them short
    res.set('Cache-Control', 'public, max-age=30'); // Cache for 30 seconds
    res.json({
      areas,
      timestamp: new Date().toISOString(),
      status: 'success'
    });

  } catch (error) {
    console.error('Congestion data error:', error);
    // Send a more detailed error response
    res.status(500).json({
      error: 'Failed to fetch facility usage data',
      message: error.message,
      details: error.response?.status ? `HTTP ${error.response.status}` : 'No response status',
      timestamp: new Date().toISOString(),
      status: 'error'
    });
  }
});

module.exports = router;
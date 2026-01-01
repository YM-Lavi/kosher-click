const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/load-restaurants', async (req, res) => {
  try {
    const { location } = req.body;
    if (!location) return res.status(400).json({ error: "Location is required" });

    const apiKey = process.env.GOOGLE_API_KEY;

    // חיפוש טקסטואלי ב-Google Places
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
      params: {
        query: `מסעדות כשרות ${location}`,
        key: apiKey,
        region: 'il'  // מבטיח תוצאות בישראל בלבד
      }
    });

    if (!response.data.results || response.data.results.length === 0) {
      return res.json({ results: [], message: "לא נמצאו מסעדות באזור הזה" });
    }

    // מיפוי תוצאות למסודר
    const results = response.data.results.map(r => ({
      name: r.name,
      address: r.formatted_address,
      rating: r.rating || 0,
      placeId: r.place_id,
      userRatingsTotal: r.user_ratings_total || 0,
      location: r.geometry?.location || { lat: null, lng: null },
      photoReference: r.photos?.[0]?.photo_reference || null
    }));

    res.json({ results });

  } catch (err) {
    console.error('Error fetching restaurants:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

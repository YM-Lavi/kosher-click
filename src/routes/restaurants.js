const express = require('express');
const router = express.Router();
const axios = require('axios');

// וודא שהמודל שלך נכון, אם אתה צריך להשתמש במונגו
// const Restaurant = require('../../models/Restaurant'); 

router.post('/load-restaurants', async (req, res) => {
  try {
    const { location } = req.body;

    if (!location || location.trim() === '') {
      return res.status(400).json({ error: 'Location is required', results: [] });
    }

    // קריאה ל-Google Places API
    const googleApiKey = process.env.GOOGLE_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=kosher+restaurants+in+${encodeURIComponent(location)}&key=${googleApiKey}`;

    const response = await axios.get(url);

    // ודא שתמיד מחזירים מערך
    const results = Array.isArray(response.data.results) ? response.data.results : [];

    // אפשר לעשות מיפוי ולשלוח רק מה שצריך
    const mappedResults = results.map(r => ({
      name: r.name,
      address: r.formatted_address,
      rating: r.rating || 0,
      user_ratings_total: r.user_ratings_total || 0,
      placeId: r.place_id,
      price_level: r.price_level || null,
      types: r.types || [],
      icon: r.icon || null,
    }));

    res.json({ results: mappedResults });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Internal server error', results: [] });
  }
});

module.exports = router;

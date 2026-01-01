const express = require('express');
const router = express.Router();
const axios = require('axios');

// טוען מסעדות כשרות לפי עיר
router.post('/load-restaurants', async (req, res) => {
  try {
    const { location } = req.body;

    if (!location || location.trim() === '') {
      return res.status(400).json({ error: 'Location is required', results: [] });
    }

    const googleApiKey = process.env.VITE_GOOGLE_API_KEY;

    if (!googleApiKey) {
      console.error("❌ GOOGLE_API_KEY לא מוגדר בשרת!");
      return res.status(500).json({ error: 'Google API key missing', results: [] });
    }

    // שאילתא טובה וברורה ל-Google
    const query = `מסעדות כשרות ${location}`;

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${googleApiKey}`;

    const response = await axios.get(url);

    console.log("📌 Google Response Status:", response.data.status);

    if (response.data.status !== "OK") {
      console.error("❌ Google Error:", response.data);
      return res.json({ results: [] });
    }

    const results = response.data.results || [];

    // מיפוי מסודר
    const mappedResults = results.map(r => ({
      name: r.name,
      address: r.formatted_address,
      rating: r.rating || 0,
      user_ratings_total: r.user_ratings_total || 0,
      place_id: r.place_id,
      price_level: r.price_level || null,
      types: r.types || [],
      photos: r.photos || [], // חשוב!
      icon: r.icon || null,
    }));

    res.json({ results: mappedResults });

  } catch (error) {
    console.error("🔥 SERVER ERROR:", error.message);
    res.status(500).json({ error: 'Internal server error', results: [] });
  }
});

module.exports = router;


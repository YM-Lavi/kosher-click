const express = require('express');
const router = express.Router();
const axios = require('axios');

// ====== טוען מסעדות כשרות לפי עיר ======
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

    const query = `מסעדות כשרות ${location}`;
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${googleApiKey}`;

    const response = await axios.get(url);

    console.log("📌 Google Response Status:", response.data.status);

    if (response.data.status !== "OK") {
      console.error("❌ Google Error:", response.data);
      return res.json({ results: [] });
    }

    const results = response.data.results || [];

    // מיפוי מסודר + יצירת URL לתמונה דרך backend
    const mappedResults = results.map(r => ({
      name: r.name,
      address: r.formatted_address,
      rating: r.rating || 0,
      user_ratings_total: r.user_ratings_total || 0,
      place_id: r.place_id,
      price_level: r.price_level || null,
      types: r.types || [],
      photos: (r.photos || []).map(photo => ({
        photo_reference: photo.photo_reference,
        width: photo.width,
        height: photo.height,
        url: `/restaurants/photo?photoRef=${photo.photo_reference}&maxwidth=400`
      })),
      icon: r.icon || null,
    }));

    res.json({ results: mappedResults });

  } catch (error) {
    console.error("🔥 SERVER ERROR:", error.message);
    res.status(500).json({ error: 'Internal server error', results: [] });
  }
});

// ====== הורדת תמונה מ-Google דרך backend ======
router.get('/photo', async (req, res) => {
  try {
    const { photoRef, maxwidth = 400 } = req.query;

    if (!photoRef) {
      return res.status(400).send('photoRef is required');
    }

    const googleApiKey = process.env.VITE_GOOGLE_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photoreference=${photoRef}&key=${googleApiKey}`;

    const response = await axios.get(url, { responseType: 'arraybuffer' });

    res.set('Content-Type', 'image/jpeg');
    res.send(Buffer.from(response.data, 'binary'));

  } catch (error) {
    console.error('🔥 Photo Error:', error.message);
    res.status(500).send('Error fetching photo');
  }
});

module.exports = router;

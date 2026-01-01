const express = require('express');
const router = express.Router();
const axios = require('axios');
const Restaurant = require('../models/Restaurant');

// =========================
// 1️⃣ Load restaurants by any location (city, neighborhood, industrial zone)
// =========================
router.post('/load-restaurants', async (req, res) => {
  try {
    const { location } = req.body; // שינוי שם מ-"city" ל-"location"
    const apiKey = process.env.VITE_GOOGLE_API_KEY;

    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }

    // =========================
    // 2️⃣ Places API textSearch
    // =========================
    const textSearchUrl = 
      `https://maps.googleapis.com/maps/api/place/textsearch/json` +
      `?query=${encodeURIComponent(location)}+kosher+restaurant` +
      `&language=he` +
      `&key=${apiKey}`;

    const placesRes = await axios.get(textSearchUrl);
    const results = placesRes.data.results || [];
    console.log('Places API results count:', results.length);

    if (!results.length) {
      return res.status(404).json({ error: 'No restaurants found for this location' });
    }

    // =========================
    // 3️⃣ שמירה / עדכון ב־DB
    // =========================
    const savedRestaurants = await Promise.all(
      results.map(async (place) => {
        const data = {
          name: place.name,
          address: place.formatted_address || place.vicinity,
          locationName: location, // שם שהמשתמש הזין
          rating: place.rating || 0,
          photoReference: place.photos?.[0]?.photo_reference || null,
          placeId: place.place_id,
          coordinates: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          }
        };

        return Restaurant.findOneAndUpdate(
          { placeId: place.place_id },
          data,
          { upsert: true, new: true }
        );
      })
    );

    res.json(savedRestaurants);

  } catch (err) {
    console.error('Server error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// =========================
// ⭐ Proxy לתמונות
// =========================
router.get('/photo/:ref', async (req, res) => {
  try {
    const apiKey = process.env.VITE_GOOGLE_API_KEY;

    const photoUrl =
      `https://maps.googleapis.com/maps/api/place/photo` +
      `?maxwidth=400` +
      `&photo_reference=${req.params.ref}` +
      `&key=${apiKey}`;

    const response = await axios.get(photoUrl, {
      responseType: 'arraybuffer'
    });

    res.set('Content-Type', response.headers['content-type']);
    res.send(response.data);
  } catch {
    res.status(404).send('No image');
  }
});

module.exports = router;

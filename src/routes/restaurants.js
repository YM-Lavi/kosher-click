const express = require('express');
const router = express.Router();
const axios = require('axios');
const Restaurant = require('../models/Restaurant');

router.post('/load-restaurants', async (req, res) => {
  try {
    const { city } = req.body;
    const apiKey = process.env.VITE_GOOGLE_API_KEY;

    if (!city) {
      return res.status(400).json({ error: 'City is required' });
    }

    // 1️⃣ Geocoding – עיר → קואורדינטות (מוגבל לישראל)
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city)}&region=il&key=${apiKey}`;
    const geoRes = await axios.get(geoUrl);

    if (!geoRes.data.results.length) {
      return res.status(404).json({ error: 'City not found' });
    }

    const { lat, lng } = geoRes.data.results[0].geometry.location;

    // 2️⃣ Nearby Search – מסעדות כשרות ליד העיר
    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=15000&type=restaurant&keyword=kosher&language=he&key=${apiKey}`;
    const placesRes = await axios.get(placesUrl);

    const results = placesRes.data.results || [];

    // 3️⃣ שמירה / עדכון ב־DB
    const savedRestaurants = await Promise.all(
      results.map(async (place) => {
        const data = {
          name: place.name,
          address: place.vicinity,
          city,
          rating: place.rating || 0,
          photoReference: place.photos?.[0]?.photo_reference || null,
          placeId: place.place_id,
          location: {
            type: 'Point',
            coordinates: [
              place.geometry.location.lng,
              place.geometry.location.lat
            ]
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
    console.error('Server error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ⭐ Route לתמונות (לא נוגעים)
router.get('/photo/:ref', async (req, res) => {
  try {
    const apiKey = process.env.VITE_GOOGLE_API_KEY;

    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${req.params.ref}&key=${apiKey}`;

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

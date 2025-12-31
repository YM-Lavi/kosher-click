const express = require('express');
const router = express.Router();
const axios = require('axios');
const Restaurant = require('../models/Restaurant');

// טעינת מסעדות לפי עיר
router.post('/load-restaurants', async (req, res) => {
  try {
    const { city } = req.body;
    if (!city) return res.status(400).json({ error: 'City is required' });

    const apiKey = process.env.VITE_GOOGLE_API_KEY;
    const query = `kosher restaurants in ${city}`;

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}&language=he`;

    const response = await axios.get(url);
    const results = response.data.results || [];

    const savedRestaurants = await Promise.all(
      results.map(async (place) => {
        const data = {
          name: place.name,
          address: place.formatted_address,
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
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ⭐ Route לתמונה (Proxy)
router.get('/photo/:ref', async (req, res) => {
  try {
    const apiKey = process.env.VITE_GOOGLE_API_KEY;

    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${req.params.ref}&key=${apiKey}`;

    const response = await axios.get(photoUrl, {
      responseType: 'arraybuffer'
    });

    res.set('Content-Type', response.headers['content-type']);
    res.send(response.data);
  } catch (err) {
    res.status(404).send('No image');
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const axios = require('axios');
const Restaurant = require('../models/Restaurant');

router.post('/load-restaurants', async (req, res) => {
  try {
    const { location } = req.body; // מה שהמשתמש הזין
    const apiKey = process.env.VITE_GOOGLE_API_KEY;

    if (!location || !location.trim()) {
      return res.status(400).json({ error: 'אנא הזן מיקום' });
    }

    // =========================
    // חיפוש Places textSearch – מגביל לישראל
    // =========================
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json` +
      `?query=${encodeURIComponent(location)}+kosher+restaurant` +
      `&region=il` +               // ✅ מגביל חיפוש לישראל
      `&language=he` +
      `&key=${apiKey}`;

    const placesRes = await axios.get(textSearchUrl);
    const { status, results, error_message } = placesRes.data;

    console.log('Places API response:', placesRes.data);

    // =========================
    // טיפול בשגיאות/ללא תוצאות
    // =========================
    if (status !== 'OK') {
      return res.status(404).json({
        error: 'לא נמצאו מסעדות למיקום זה',
        googleStatus: status,
        message: error_message || null
      });
    }

    if (!results.length) {
      return res.status(404).json({ error: 'לא נמצאו מסעדות למיקום זה' });
    }

    // =========================
    // שמירה / עדכון ב-DB
    // =========================
    const savedRestaurants = await Promise.all(
      results.map(async (place) => {
        const data = {
          name: place.name,
          address: place.formatted_address || place.vicinity,
          locationName: location, // מה שהמשתמש הזין
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
    // =========================
    // טיפול מפורט בשגיאות axios
    // =========================
    if (err.response) {
      console.error('Error response from Google API:', err.response.data);
      return res.status(500).json({
        error: 'שגיאה בשרת',
        details: err.response.data
      });
    } else if (err.request) {
      console.error('No response received from Google API:', err.request);
      return res.status(500).json({ error: 'אין תשובה מ-Google API' });
    } else {
      console.error('Unknown server error:', err.message);
      return res.status(500).json({ error: 'שגיאה לא ידועה בשרת', details: err.message });
    }
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

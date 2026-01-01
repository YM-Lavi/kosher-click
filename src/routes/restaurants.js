const express = require('express');
const router = express.Router();
const axios = require('axios');
const Restaurant = require('../models/Restaurant');

router.post('/load-restaurants', async (req, res) => {
  try {
    const { location } = req.body;
    const apiKey = process.env.VITE_GOOGLE_API_KEY;

    if (!location || !location.trim()) {
      return res.status(400).json({ error: 'אנא הזן מיקום' });
    }

    // =========================
    // 1️⃣ Geocoding – location → lat/lng + סוג
    // =========================
    const geoRes = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&region=il&language=he&key=${apiKey}`
    );

    if (!geoRes.data.results.length) {
      return res.status(404).json({ error: 'מיקום לא נמצא' });
    }

    const geo = geoRes.data.results[0];
    const { lat, lng } = geo.geometry.location;

    // החלטת רדיוס חכם לפי סוג המקום
    const types = geo.types; // ex: ["locality"] או ["sublocality_level_1"]
    let radius = 1000; // ברירת מחדל: שכונה
    if (types.includes('locality')) radius = 10000; // עיר → 10 ק"מ

    // =========================
    // 2️⃣ Nearby Search – מסעדות כשרות קרובות
    // =========================
    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=${lat},${lng}` +
      `&radius=${radius}` +
      `&type=restaurant` +
      `&keyword=kosher` +
      `&language=he` +
      `&region=il` +
      `&key=${apiKey}`;

    const placesRes = await axios.get(placesUrl);
    const { status, results } = placesRes.data;

    if (status !== 'OK' || !results.length) {
      return res.status(404).json({ error: 'לא נמצאו מסעדות קרובות למיקום זה' });
    }

    // =========================
    // 3️⃣ שמירה / עדכון ב־DB
    // =========================
    const savedRestaurants = await Promise.all(
      results.map(async (place) => {
        const coords = place.geometry?.location
          ? [place.geometry.location.lng, place.geometry.location.lat]
          : null;
        if (!coords) return null; // דילוג על מסעדות בלי קואורדינטות

        // סינון לפי עיר/שכונה מתוך address_components
        const components = place.address_components || [];
        const cityComponent = components.find(c => c.types.includes('locality') || c.types.includes('sublocality'));
        const cityName = cityComponent?.long_name || '';
        if (!cityName.includes(location)) return null; // אם העיר/שכונה לא תואמת → דילוג

        const data = {
          name: place.name,
          address: place.formatted_address || place.vicinity,
          locationName: location,
          rating: place.rating || 0,
          photoReference: place.photos?.[0]?.photo_reference || null,
          placeId: place.place_id,
          location: {
            type: 'Point',
            coordinates: coords
          }
        };

        return Restaurant.findOneAndUpdate(
          { placeId: place.place_id },
          data,
          { upsert: true, new: true }
        );
      })
    );

    res.json(savedRestaurants.filter(r => r !== null));

  } catch (err) {
    console.error('Server error:', err.message, err.response?.data || '');
    res.status(500).json({ error: 'שגיאה לא ידועה בשרת', details: err.message });
  }
});

// =========================
// ⭐ Proxy לתמונות
// =========================
router.get('/photo/:ref', async (req, res) => {
  try {
    const apiKey = process.env.VITE_GOOGLE_API_KEY;

    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo` +
      `?maxwidth=400&photo_reference=${req.params.ref}&key=${apiKey}`;

    const response = await axios.get(photoUrl, { responseType: 'arraybuffer' });

    res.set('Content-Type', response.headers['content-type']);
    res.send(response.data);
  } catch {
    res.status(404).send('No image');
  }
});

module.exports = router;

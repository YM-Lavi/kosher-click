const express = require('express');
const router = express.Router();
const axios = require('axios');
const Restaurant = require('../../models/Restaurant'); // המודל שלך

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

router.post('/load-restaurants', async (req, res) => {
  const { city } = req.body;

  if (!city || city.trim() === '') {
    return res.status(400).json({ error: 'Location is required' });
  }

  try {
    // חיפוש Google Places Text Search (כולל אזורי תעשייה, יישובים קטנים)
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/textsearch/json`,
      {
        params: {
          query: `מסעדות כשרות ב${city}`,
          key: GOOGLE_API_KEY,
          language: 'he',
        },
      }
    );

    if (response.data.status !== 'OK') {
      return res.status(500).json({ error: 'שגיאה ב-Google Places', details: response.data });
    }

    const results = response.data.results;

    // פילטר – נשמור רק מסעדות עם קואורדינטות בישראל
    const restaurants = results
      .filter(r => r.geometry?.location && r.formatted_address?.includes('ישראל'))
      .map(r => ({
        placeId: r.place_id,
        name: r.name,
        address: r.formatted_address,
        rating: r.rating || 0,
        userRatingsTotal: r.user_ratings_total || 0,
        photoReference: r.photos?.[0]?.photo_reference || null,
        location: {
          type: 'Point',
          coordinates: [r.geometry.location.lng, r.geometry.location.lat]
        }
      }));

    // עדכון למסד (אם רוצים) – ניתן להוסיף check אם כבר קיים
    // await Restaurant.insertMany(restaurants);

    return res.json(restaurants);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'שגיאה לא ידועה בשרת', details: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const axios = require('axios');
const Restaurant = require('../models/Restaurant'); // ודא שהמודל נכון
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Helper: קבלת מסעדות מגוגל
async function fetchRestaurantsFromGoogle(query) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
  const res = await axios.get(url, {
    params: {
      query: `${query} kosher`,
      key: GOOGLE_API_KEY,
      region: 'IL', // מגביל למסעדות בישראל
    },
  });

  if (res.data.status !== 'OK') return [];

  return res.data.results.map(r => {
    if (!r.geometry?.location?.lat || !r.geometry?.location?.lng) return null;
    return {
      placeId: r.place_id,
      name: r.name,
      address: r.formatted_address,
      location: {
        type: 'Point',
        coordinates: [r.geometry.location.lng, r.geometry.location.lat],
      },
      rating: r.rating || 0,
      userRatingsTotal: r.user_ratings_total || 0,
      photoReference: r.photos?.[0]?.photo_reference || null,
    };
  }).filter(Boolean); // מסיר null
}

// Route: טעינת מסעדות
router.post('/load-restaurants', async (req, res) => {
  try {
    const { city } = req.body;
    if (!city) return res.status(400).json({ error: 'Location is required' });

    // תחילה ננסה לחפש במונגו
    let restaurants = await Restaurant.find({
      $text: { $search: city },
      'location.coordinates.0': { $exists: true },
      'location.coordinates.1': { $exists: true },
    });

    // אם אין תוצאות במונגו, נשלוף מגוגל
    if (!restaurants.length) {
      restaurants = await fetchRestaurantsFromGoogle(city);

      // שמירת התוצאות במונגו למעקב עתידי
      for (const r of restaurants) {
        const exists = await Restaurant.findOne({ placeId: r.placeId });
        if (!exists) await Restaurant.create(r);
      }
    }

    res.json(restaurants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה לא ידועה בשרת', details: err.message });
  }
});

module.exports = router;

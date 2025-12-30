const express = require('express');
const router = express.Router();
const axios = require('axios');
const Restaurant = require('../models/Restaurant');

router.post('/load-restaurants', async (req, res) => {
    try {
        const { city } = req.body;
        // וודא שהשם הזה תואם בדיוק למה שהגדרת ב-Render Settings
        const apiKey = process.env.VITE_GOOGLE_API_KEY;

        if (!city) return res.status(400).json({ error: "City is required" });

        const searchQuery = `kosher restaurants in ${city}`;
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}&language=he`;

        const response = await axios.get(url);

        if (response.data.status === "REQUEST_DENIED") {
            console.error("Google API Error:", response.data.error_message);
            return res.status(403).json({ error: "API Key or Billing issue" });
        }

        const results = response.data.results || [];
        
        // עיבוד ושמירה ב-Database
        const savedRestaurants = await Promise.all(results.map(async (place) => {
            const restaurantData = {
                name: place.name,
                address: place.formatted_address,
                city: city,
                rating: place.rating || 0,
                photoReference: place.photos ? place.photos[0].photo_reference : null,
                placeId: place.place_id,
                location: {
                    type: 'Point',
                    coordinates: [place.geometry.location.lng, place.geometry.location.lat]
                }
            };

            return await Restaurant.findOneAndUpdate(
                { placeId: place.place_id },
                restaurantData,
                { upsert: true, new: true }
            );
        }));

        res.json(savedRestaurants);
    } catch (err) {
        console.error("Server Error:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;


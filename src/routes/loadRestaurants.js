const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const restaurantsData = require('../data/restaurants.json');

// POST /load-restaurants
router.post('/', async (req, res) => {
  try {
    const inserted = await Restaurant.insertMany(restaurantsData);
    res.json({ message: 'Restaurants loaded!', count: inserted.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;


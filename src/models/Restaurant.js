const mongoose = require('mongoose');

const RestaurantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String },
    city: { type: String },
    rating: { type: Number, default: 0 },
    userRatingsTotal: { type: Number, default: 0 },
    photoReference: { type: String },
    location: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], required: true }
    },
    placeId: { type: String, unique: true, required: true }
});

module.exports = mongoose.model('Restaurant', RestaurantSchema);
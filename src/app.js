const express = require('express');
const cors = require('cors'); // וודא שהשורה הזו קיימת
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();

// חיבור ל-Database
connectDB();

// Middleware
app.use(cors({
  origin: '*', // מאפשר לכל דומיין (כולל Vercel) לגשת לשרת
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));app.use(express.json());

// Routes
app.use('/restaurants', require('./routes/restaurants'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on ${PORT}`));

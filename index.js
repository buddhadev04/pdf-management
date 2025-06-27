require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');
const { connectToMongoDB } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'public')));
let frontendUrl = 'https://doc-vault.onrender.com';
app.use(cors({ origin: frontendUrl }));
app.use(apiRoutes);

// Multer error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err.message, err.stack);
    return res.status(400).json({ error: `Multer error: ${err.message}` });
  }
  next(err);
});

// Start server after MongoDB connection
connectToMongoDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
  });
}).catch((err) => {
  console.error('Failed to start server due to MongoDB connection error:', err);
});
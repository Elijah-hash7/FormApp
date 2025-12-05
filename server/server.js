const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const session = require('express-session');


const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB FIRST
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));



app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || "supersecret",
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: "lax"
  }
}));


// Routes
const formRoutes = require('./routes/forms');
app.use('/api/forms', formRoutes);

const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

const responseRoutes = require('./routes/responses');
app.use('/api/responses', responseRoutes);

const webhookRoutes = require('./routes/webhooks');
app.use('/api/webhooks', webhookRoutes);

const airtableRoutes = require('./routes/airtable');
app.use('/api/airtable', airtableRoutes);

app.get('/api', (req, res) => {
  res.json({ message: "Elijah.hash Sends his regard" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
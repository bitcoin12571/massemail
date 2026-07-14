require('dotenv').config({ path: process.env.NODE_ENV === 'development' ? '.env.local' : '.env' });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { startScheduler } = require('./services/schedulerService');

// Use mock services for local development if enabled
const USE_MOCK_AI = process.env.USE_MOCK_AI === 'true';
const USE_MOCK_EMAIL = process.env.USE_MOCK_EMAIL === 'true';

if (USE_MOCK_AI || USE_MOCK_EMAIL) {
  console.log('⚠️  RUNNING IN MOCK MODE (Local Development)');
  if (USE_MOCK_AI) console.log('   🤖 Using mock AI service (no API key needed)');
  if (USE_MOCK_EMAIL) console.log('   📧 Using mock email service (no SendGrid key needed)');
}

const app = express();

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://email-dashboard-nine-brown.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/newsletters', require('./routes/newsletterRoutes'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server running', timestamp: new Date().toISOString() });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/newsletter')
  .then(() => {
    console.log('✅ MongoDB connected');

    // Start scheduler
    console.log('⏰ Starting scheduler...');
    require('./services/schedulerService').initializeSchedulers();
  })
  .catch(err => console.error('❌ MongoDB error:', err));

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

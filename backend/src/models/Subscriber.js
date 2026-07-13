const mongoose = require('mongoose');

const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  firstName: String,
  lastName: String,
  isSubscribed: { type: Boolean, default: true },
  subscriptionDate: { type: Date, default: Date.now },
  unsubscribeDate: Date,
  tags: [String],
  preferences: {
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' }
  }
});

module.exports = mongoose.model('Subscriber', subscriberSchema);

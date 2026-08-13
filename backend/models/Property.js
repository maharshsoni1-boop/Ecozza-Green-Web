const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String, // "Residential (1 - 5 K Liters)", "Commercial (10K - 50K Liters)", "Industrial (50K - 100K Liters)"
    required: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  district: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  septicTankSizeLiters: {
    type: Number,
    default: null // site inspector will set it during audit
  },
  googleMapsUrl: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Property', PropertySchema);

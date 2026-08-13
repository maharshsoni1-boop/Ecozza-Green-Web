const mongoose = require('mongoose');

const ServiceRecordSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  wasteProcessedLiters: {
    type: Number,
    required: true
  },
  biocharProducedKg: {
    type: Number,
    required: true
  },
  waterRecoveredLiters: {
    type: Number,
    required: true
  },
  completionDate: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('ServiceRecord', ServiceRecordSchema);

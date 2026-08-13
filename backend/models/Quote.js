const mongoose = require('mongoose');

const QuoteSchema = new mongoose.Schema({
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
  serviceDetails: {
    type: String,
    required: true
  },
  quotedAmount: {
    type: Number,
    required: true
  },
  additionalCharges: {
    type: Number,
    default: 0
  },
  dayRates: [
    {
      dayNumber: Number,
      amount: Number
    }
  ],
  totalAmount: {
    type: Number,
    required: true
  },
  termsNotes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['SENT', 'ACCEPTED', 'DECLINED'],
    default: 'SENT'
  }
}, { timestamps: true });

module.exports = mongoose.model('Quote', QuoteSchema);

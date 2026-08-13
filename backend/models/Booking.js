const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  bookingType: {
    type: String,
    required: true
  },
  siteVisitDate: {
    type: String, // "YYYY-MM-DD"
    required: true
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['REQUESTED', 'ASSESSMENT', 'QUOTE_SENT', 'QUOTE_ACCEPTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'REQUESTED' // starts as REQUESTED site visit request
  },
  assignedEngineer: {
    type: String,
    default: 'Rajesh Patel'
  },
  operatorPhone: {
    type: String,
    default: '9876543210'
  },
  // Site Visit audited details
  unit: {
    type: String, // "ft" or "m"
    default: null
  },
  tanks: [
    {
      length: Number,
      width: Number,
      height: Number,
      filledHeight: Number,
      calculatedVolumeLiters: Number,
      calculatedCapacityLiters: Number
    }
  ],
  actualCapacityLiters: {
    type: Number,
    default: null
  },
  actualVolumeLiters: {
    type: Number,
    default: null
  },
  numberOfTanks: {
    type: Number,
    default: null
  },
  tankDimensionsText: {
    type: String,
    default: null
  },
  pipeLengthRequiredMeters: {
    type: Number,
    default: null
  },
  electricityConnection: {
    type: Boolean,
    default: null
  },
  treatmentDate: {
    type: String, // "YYYY-MM-DD" for scheduled desludging service
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);

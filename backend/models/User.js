const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  phone: {
    type: String,
    unique: true,
    sparse: true // Allows multiple operators with null phone number
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['customer', 'operator'],
    default: 'customer'
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true
  },
  customerId: {
    type: String,
    unique: true,
    sparse: true
  },
  password: {
    type: String // Simple string password for demonstration prototype
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);

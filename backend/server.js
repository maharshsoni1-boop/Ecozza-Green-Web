require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const PDFDocument = require('pdfkit');

const User = require('./models/User');
const Property = require('./models/Property');
const Booking = require('./models/Booking');
const Quote = require('./models/Quote');
const ServiceRecord = require('./models/ServiceRecord');
const Notification = require('./models/Notification');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected successfully!');
  seedOperator();
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Seed operator account (Rajesh Patel: 1234 / 4321 / phone: 9876543210)
async function seedOperator() {
  try {
    // Delete any old ID '123' account to prevent conflicts
    await User.deleteOne({ employeeId: '123' });

    let existing = await User.findOne({ employeeId: '1234' });
    if (!existing) {
      await User.create({
        name: 'Rajesh Patel',
        role: 'operator',
        employeeId: '1234',
        password: '4321',
        phone: '9876543210'
      });
      console.log('Operator Rajesh Patel seeded (ID: 1234, PW: 4321, Phone: 9876543210).');
    } else {
      existing.password = '4321';
      existing.phone = '9876543210';
      await existing.save();
      console.log('Operator Rajesh Patel credentials verified (ID: 1234, PW: 4321).');
    }
  } catch (err) {
    console.error('Error seeding operator:', err);
  }
}

/* ================= AUTHENTICATION APIS ================= */

// Send OTP simulation
app.post('/api/auth/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.trim().length < 10) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
  }
  // Enforce standard Indian verification routing: simulate sending OTP code 123456
  return res.status(200).json({ 
    message: 'OTP sent successfully!',
    otpSimulated: '123456' 
  });
});

// Verify OTP & register/login
app.post('/api/auth/verify-otp', async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ error: 'Phone number and verification code are required.' });
  }

  if (code !== '123456' && code !== '1234') {
    return res.status(400).json({ error: 'Invalid verification code. Try using 123456' });
  }

  try {
    let user = await User.findOne({ phone, role: 'customer' });
    if (user) {
      return res.status(200).json({ 
        message: 'Login successful', 
        user, 
        profileRequired: false 
      });
    } else {
      // Return flag indicating profile details (name, email) are needed
      return res.status(200).json({ 
        message: 'OTP Verified. Profile completion required.', 
        phone, 
        profileRequired: true 
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server authentication failure.' });
  }
});

// Create Customer Profile
app.post('/api/auth/register-profile', async (req, res) => {
  const { phone, name, email } = req.body;
  if (!phone || !name) {
    return res.status(400).json({ error: 'Name and verified phone number are required.' });
  }

  try {
    // Double check unique phone constraint
    let existing = await User.findOne({ phone, role: 'customer' });
    if (existing) {
      return res.status(400).json({ error: 'Phone number already registered.' });
    }

    const user = await User.create({
      phone,
      name,
      email,
      role: 'customer'
    });

    res.status(201).json({ message: 'Profile registered successfully', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create customer account.' });
  }
});

// Operator Login (ID & Password)
app.post('/api/auth/operator-login', async (req, res) => {
  const { employeeId, password } = req.body;
  if (!employeeId || !password) {
    return res.status(400).json({ error: 'Employee ID and password are required.' });
  }

  try {
    const user = await User.findOne({ employeeId, role: 'operator' });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid Employee ID or Password.' });
    }

    res.status(200).json({ message: 'Operator authenticated successfully', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Operator login server error.' });
  }
});


/* ================= PROPERTIES APIS ================= */

// List user properties
app.get('/api/properties/user/:userId', async (req, res) => {
  try {
    const properties = await Property.find({ userId: req.params.userId });
    res.status(200).json(properties);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve properties.' });
  }
});

// Add Property
app.post('/api/properties', async (req, res) => {
  const { userId, name, type, address, city, district, state, latitude, longitude, googleMapsUrl } = req.body;
  if (!userId || !name || !address || !city || !district || !state) {
    return res.status(400).json({ error: 'Missing required property details (name, address, city, district, state).' });
  }

  try {
    const property = await Property.create({
      userId,
      name,
      type,
      address,
      city,
      district,
      state,
      latitude,
      longitude,
      googleMapsUrl
    });
    res.status(201).json(property);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save property.' });
  }
});

// Update Property
app.put('/api/properties/:id', async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(property);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update property.' });
  }
});

// Delete Property
app.delete('/api/properties/:id', async (req, res) => {
  try {
    await Property.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Property deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete property.' });
  }
});


/* ================= BOOKINGS & CUSTOMER APIS ================= */

// List user bookings
app.get('/api/bookings/user/:userId', async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.status(200).json(bookings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve bookings.' });
  }
});

// Create Booking (inspection site visit)
app.post('/api/bookings', async (req, res) => {
  const { userId, propertyId, bookingType, siteVisitDate, isUrgent } = req.body;
  if (!userId || !propertyId || !siteVisitDate) {
    return res.status(400).json({ error: 'Missing required booking inputs.' });
  }

  try {
    // Starts in REQUESTED status, auto assigned to Rajesh Patel
    const booking = await Booking.create({
      userId,
      propertyId,
      bookingType,
      siteVisitDate,
      isUrgent,
      status: 'REQUESTED',
      assignedEngineer: 'Rajesh Patel'
    });

    // Create system notification
    await Notification.create({
      userId,
      title: 'Site Visit Requested',
      body: `Your site visit request has been successfully registered. Preferred visit date: ${siteVisitDate}.`
    });

    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create inspection booking.' });
  }
});

// Fetch Active Quote details for booking
app.get('/api/quotes/booking/:bookingId', async (req, res) => {
  try {
    const quote = await Quote.findOne({ bookingId: req.params.bookingId });
    res.status(200).json(quote);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load quote details.' });
  }
});

// Accept Quote
app.post('/api/quotes/:id/accept', async (req, res) => {
  try {
    const quote = await Quote.findByIdAndUpdate(req.params.id, { status: 'ACCEPTED' }, { new: true });
    if (!quote) return res.status(404).json({ error: 'Quote not found' });

    // Update booking status to QUOTE_ACCEPTED
    await Booking.findByIdAndUpdate(quote.bookingId, { status: 'QUOTE_ACCEPTED' });

    res.status(200).json(quote);
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept quote.' });
  }
});

// Decline Quote
app.post('/api/quotes/:id/decline', async (req, res) => {
  try {
    const quote = await Quote.findByIdAndUpdate(req.params.id, { status: 'DECLINED' }, { new: true });
    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    
    // Update booking status to CANCELLED/DECLINED
    await Booking.findByIdAndUpdate(quote.bookingId, { status: 'CANCELLED' });

    res.status(200).json(quote);
  } catch (err) {
    res.status(500).json({ error: 'Failed to decline quote.' });
  }
});

// Fetch active service record completion details
app.get('/api/service-records/booking/:bookingId', async (req, res) => {
  try {
    const record = await ServiceRecord.findOne({ bookingId: req.params.bookingId });
    res.status(200).json(record);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve service record.' });
  }
});


/* ================= OPERATOR APIS ================= */

// List bookings assigned to operator Rajesh Patel
app.get('/api/operator/bookings', async (req, res) => {
  try {
    const bookingsList = await Booking.find({
      $or: [{ assignedEngineer: 'Rajesh Patel' }, { assignedEngineer: null }]
    }).sort({ updatedAt: -1 });
    res.status(200).json(bookingsList);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve operator tasks.' });
  }
});

// Accept Site Visit Request (REQUESTED -> ASSESSMENT)
app.post('/api/operator/bookings/:id/accept', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking task not found.' });

    booking.status = 'ASSESSMENT';
    await booking.save();

    await Notification.create({
      userId: booking.userId,
      title: 'Site Visit Scheduled',
      body: 'Visiting engineer Rajesh Patel has accepted your site visit request and will begin assessment.'
    });

    res.status(200).json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept site visit request.' });
  }
});

// Submit Site Assessment & dispatch Day-Wise Quote
app.post('/api/operator/bookings/:id/assessment', async (req, res) => {
  const { id } = req.params;
  const { unit, tanks, pipeLength, electricity, dayRates, serviceDetails, termsNotes } = req.body;

  try {
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Booking task not found.' });

    // Calculate dimensions text, capacities and volumes
    const multiplier = unit === 'm' ? 1000 : 28.3168;
    let totalCapacity = 0;
    let totalVolume = 0;
    const computedTanks = [];
    const dimensionsTextList = [];

    if (tanks && Array.isArray(tanks)) {
      tanks.forEach((t, idx) => {
        const len = parseFloat(t.length || 0);
        const wid = parseFloat(t.width || 0);
        const hgt = parseFloat(t.height || 0);
        const fHgt = parseFloat(t.filledHeight || 0);

        const capLiters = Math.round(len * wid * hgt * multiplier);
        const volLiters = Math.round(len * wid * fHgt * multiplier);

        totalCapacity += capLiters;
        totalVolume += volLiters;

        computedTanks.push({
          length: len,
          width: wid,
          height: hgt,
          filledHeight: fHgt,
          calculatedCapacityLiters: capLiters,
          calculatedVolumeLiters: volLiters
        });

        dimensionsTextList.push(`Tank ${idx+1}: ${len}x${wid}x${hgt} ${unit} (Filled: ${fHgt} ${unit})`);
      });
    }

    const numTanks = computedTanks.length;
    const dimensionsText = dimensionsTextList.join('; ');

    // 1. Update Booking audit parameters
    booking.unit = unit;
    booking.tanks = computedTanks;
    booking.actualCapacityLiters = totalCapacity;
    booking.actualVolumeLiters = totalVolume;
    booking.numberOfTanks = numTanks;
    booking.tankDimensionsText = dimensionsText;
    booking.pipeLengthRequiredMeters = pipeLength;
    booking.electricityConnection = electricity;
    booking.status = 'QUOTE_SENT';
    await booking.save();

    // 2. Save inspected capacity directly to customer's property profile!
    await Property.findByIdAndUpdate(booking.propertyId, { septicTankSizeLiters: totalCapacity });

    // 3. Create and Dispatch Quote based on Day-wise rates
    const cleanedDayRates = (dayRates || []).map((dr, idx) => ({
      dayNumber: dr.dayNumber || (idx + 1),
      amount: parseFloat(dr.amount || 0)
    }));

    const totalQuoteAmount = cleanedDayRates.reduce((sum, item) => sum + item.amount, 0);

    const generatedServiceDetails = serviceDetails || `De-sludging recovery of ${totalVolume}L waste across ${numTanks} tanks (Total Cap: ${totalCapacity}L) using ${pipeLength}m hose piping.`;

    // Remove any existing quote for this booking just in case
    await Quote.deleteOne({ bookingId: id });

    await Quote.create({
      bookingId: id,
      userId: booking.userId,
      serviceDetails: generatedServiceDetails,
      quotedAmount: totalQuoteAmount,
      dayRates: cleanedDayRates,
      totalAmount: totalQuoteAmount,
      termsNotes: termsNotes || `Electricity Connection: ${electricity ? 'Available' : 'Required'}. Valid for 30 days.`,
      status: 'SENT'
    });

    // 4. Create Notification
    await Notification.create({
      userId: booking.userId,
      title: 'Day-Wise Quote Ready',
      body: `Engineer Rajesh Patel completed the assessment. Day-wise quote total: $${totalQuoteAmount.toFixed(2)}. Review and approve in app.`
    });

    res.status(200).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit site inspection details.' });
  }
});

// Schedule desludging service (QUOTE_ACCEPTED -> SCHEDULED)
app.post('/api/operator/bookings/:id/schedule', async (req, res) => {
  const { treatmentDate } = req.body;
  if (!treatmentDate) {
    return res.status(400).json({ error: 'Treatment schedule date is required.' });
  }

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking task not found.' });

    booking.status = 'SCHEDULED';
    booking.treatmentDate = treatmentDate;
    await booking.save();

    await Notification.create({
      userId: booking.userId,
      title: 'De-sludging Scheduled',
      body: `Your organic de-sludging recovery service has been successfully scheduled for ${treatmentDate}.`
    });

    res.status(200).json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Failed to schedule service.' });
  }
});


// Start service de-sludging on-site (Quote accepted -> IN_PROGRESS)
app.post('/api/operator/bookings/:id/start', async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, { status: 'IN_PROGRESS' }, { new: true });
    if (!booking) return res.status(404).json({ error: 'Booking task not found.' });

    // Send Notification
    await Notification.create({
      userId: booking.userId,
      title: 'Draining Started',
      body: 'Operator has started the organic waste desludging recovery process at your site.'
    });

    res.status(200).json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Failed to activate service.' });
  }
});

// Complete desludging service and log recovery metrics
app.post('/api/operator/bookings/:id/complete', async (req, res) => {
  const { id } = req.params;
  const { wasteProcessed, biochar, water } = req.body;

  try {
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Booking task not found.' });

    // 1. Update Booking status to COMPLETED
    booking.status = 'COMPLETED';
    await booking.save();

    // 2. Log Service Record Metrics
    await ServiceRecord.create({
      bookingId: id,
      userId: booking.userId,
      wasteProcessedLiters: wasteProcessed,
      biocharProducedKg: biochar,
      waterRecoveredLiters: water,
      completionDate: booking.siteVisitDate
    });

    // 3. Create Notification
    await Notification.create({
      userId: booking.userId,
      title: 'Service Complete & Certified',
      body: `Congratulations! Your zero-waste recovery service is complete. ${wasteProcessed} L of waste processed.`
    });

    res.status(200).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete task and log recovery outcomes.' });
  }
});


/* ================= NOTIFICATIONS APIS ================= */

// List user notifications
app.get('/api/notifications/user/:userId', async (req, res) => {
  try {
    const notifs = await Notification.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.status(200).json(notifs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load notifications.' });
  }
});

// Mark Notification as read
app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    res.status(200).json(notif);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification status.' });
  }
});


/* ================= DYNAMIC PDF BUILDERS WITH BORDER & CENTERED LOGO ================= */

// Helper to draw clean Ecozza Document Frame (Border & Center Logo)
function drawDocumentFrame(doc, title) {
  const path = require('path');
  const logoPath = path.join(__dirname, '../frontend/public/logo.png');

  // Double Border Frame
  doc.save();
  doc.rect(20, 20, 555, 802).lineWidth(5).stroke('#1B5E20');
  doc.rect(27, 27, 541, 788).lineWidth(1.5).stroke('#81C784');
  doc.restore();

  // Center Logo
  try {
    doc.image(logoPath, 200, 42, { width: 195 });
  } catch (err) {
    doc.fillColor('#1B5E20')
       .fontSize(22)
       .font('Helvetica-Bold')
       .text('ECOZZA GREEN', 40, 60, { align: 'center' });
  }

  // Document Title Header
  doc.fillColor('#757575')
     .fontSize(10)
     .font('Helvetica-Bold')
     .text(title.toUpperCase(), 40, 150, { align: 'center' });

  // Decorative Horizontal Divider
  doc.moveTo(80, 172).lineTo(515, 172).lineWidth(1).stroke('#E0E0E0');
}

// Service Completion Letter PDF builder
app.get('/api/certificate/pdf/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await Booking.findById(bookingId).populate('propertyId');
    if (!booking) return res.status(404).send('Booking profile not found.');

    const record = await ServiceRecord.findOne({ bookingId });
    if (!record) return res.status(404).send('Completion records not ready.');

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    
    // Stream PDF response header
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Ecozza_Completion_Letter_${bookingId.substring(0, 8)}.pdf`);
    doc.pipe(res);

    // Draw frame & centered logo
    drawDocumentFrame(doc, 'SERVICE COMPLETION LETTER');

    // Certificate text
    doc.fillColor('#000000')
       .fontSize(12)
       .font('Helvetica')
       .text('This is to certify that organic sludge vacuum recovery and eco-safe', 40, 195, { align: 'center' })
       .text('recycling treatment were completed at the following property:', 40, 212, { align: 'center' });

    // Property Address Card content
    doc.fillColor('#1B5E20')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text(booking.propertyId.name, 40, 245, { align: 'center' });

    const fullAddress = `${booking.propertyId.address}, ${booking.propertyId.city}, ${booking.propertyId.district}, ${booking.propertyId.state}`;
    doc.fillColor('#424242')
       .fontSize(11)
       .font('Helvetica')
       .text(fullAddress, 40, 268, { align: 'center' });

    doc.fillColor('#000000')
       .text(`Service Completion Date: ${record.completionDate}`, 40, 305, { align: 'center' });

    // Horizontal Divider
    doc.moveTo(80, 335).lineTo(515, 335).lineWidth(1).stroke('#E0E0E0');

    // Environmental metrics recovery table
    doc.fillColor('#1B5E20')
       .fontSize(13)
       .font('Helvetica-Bold')
       .text('RESOURCE RECOVERY & OUT-TURN METRICS', 80, 360);

    doc.fillColor('#000000')
       .fontSize(11)
       .font('Helvetica');

    doc.text('• Waste Processed & Extracted:', 85, 395);
    doc.font('Helvetica-Bold').text(`${record.wasteProcessedLiters} Liters`, 380, 395).font('Helvetica');

    doc.text('• Liquid Recovered (For Land Application):', 85, 425);
    doc.font('Helvetica-Bold').text(`${record.waterRecoveredLiters} Liters`, 380, 425).font('Helvetica');

    doc.text('• Solid Waste Recovered (Biochar):', 85, 455);
    doc.font('Helvetica-Bold').text(`${record.biocharProducedKg} kg`, 380, 455).font('Helvetica');

    // Horizontal Divider
    doc.moveTo(80, 495).lineTo(515, 495).lineWidth(1).stroke('#E0E0E0');

    // Authorizations
    doc.fillColor('#757575')
       .fontSize(9)
       .text('AUTHORIZED SIGNATORY', 80, 545)
       .fillColor('#1B5E20')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('Ecozza Green Operations Team', 80, 562);

    doc.fillColor('#757575')
       .fontSize(9)
       .font('Helvetica')
       .text('LETTER REFERENCE ID', 360, 545)
       .fillColor('#000000')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text(`EZ-SCL-${bookingId.substring(0, 8).toUpperCase()}`, 360, 562);

    // Green Stamp approved seal
    doc.save();
    doc.fillColor('#E8F5E9').circle(460, 650, 40).fill();
    doc.strokeColor('#2E7D32').lineWidth(2).circle(460, 650, 40).stroke();
    doc.restore();

    doc.fillColor('#2E7D32')
       .fontSize(8.5)
       .font('Helvetica-Bold')
       .text('VERIFIED', 438, 642)
       .text('COMPLETED', 433, 654);

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error compiling completion letter.');
  }
});

// Dynamic Quote PDF Builder
app.get('/api/quote/pdf/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await Booking.findById(bookingId).populate('propertyId');
    if (!booking) return res.status(404).send('Booking profile not found.');

    const quote = await Quote.findOne({ bookingId });
    if (!quote) return res.status(404).send('Service quote not ready.');

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Ecozza_Quote_${bookingId.substring(0, 8)}.pdf`);
    doc.pipe(res);

    // Draw frame & centered logo
    drawDocumentFrame(doc, 'SERVICE QUOTE & ESTIMATE');

    // Client/Property Information
    doc.fillColor('#000000')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('PREPARED FOR:', 50, 195);
       
    doc.fillColor('#1B5E20')
       .fontSize(14)
       .text(booking.propertyId.name, 50, 212);

    const fullAddress = `${booking.propertyId.address}, ${booking.propertyId.city}, ${booking.propertyId.district}, ${booking.propertyId.state}`;
    doc.fillColor('#424242')
       .fontSize(10)
       .font('Helvetica')
       .text(fullAddress, 50, 232, { width: 300 });

    // Quote details (right column)
    doc.fillColor('#000000')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text(`QUOTE NO: Q-${quote._id.toString().substring(0, 8).toUpperCase()}`, 380, 195)
       .font('Helvetica')
       .text(`Date: ${new Date(quote.createdAt).toLocaleDateString('en-IN')}`, 380, 212)
       .text(`Status: ${quote.status}`, 380, 229);

    // Divider
    doc.moveTo(40, 265).lineTo(555, 265).lineWidth(1).stroke('#E0E0E0');

    // Audited Septic Specifications
    doc.fillColor('#1B5E20')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('SITE AUDIT ASSESSMENT METRICS', 50, 285);

    doc.fillColor('#000000')
       .fontSize(10)
       .font('Helvetica');

    doc.text(`• Number of Tanks Audited: ${booking.numberOfTanks || 1}`, 60, 310);
    doc.text(`• Total Audited Capacity: ${(booking.actualCapacityLiters || 0).toLocaleString()} Liters`, 60, 327);
    doc.text(`• Pipe Length Required: ${booking.pipeLengthRequiredMeters || 0} Meters`, 60, 344);
    doc.text(`• Electricity Available: ${booking.electricityConnection ? 'Yes' : 'No'}`, 60, 361);

    if (booking.tankDimensionsText) {
      doc.text(`• Dimensions: ${booking.tankDimensionsText}`, 60, 378, { width: 480 });
    }

    // Divider
    doc.moveTo(40, 410).lineTo(555, 410).lineWidth(1).stroke('#E0E0E0');

    // Financial breakdown table
    doc.fillColor('#1B5E20')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('DAY-WISE TREATMENT RATE BREAKDOWN', 50, 430);

    doc.fillColor('#000000')
       .fontSize(10)
       .font('Helvetica');

    let currentY = 455;
    if (quote.dayRates && quote.dayRates.length > 0) {
      quote.dayRates.forEach(dr => {
        doc.text(`Day ${dr.dayNumber} Recovery & Pasteurization Services:`, 60, currentY);
        doc.font('Helvetica-Bold').text(`₹${dr.amount.toLocaleString('en-IN')}.00`, 380, currentY).font('Helvetica');
        currentY += 20;
      });
    } else {
      doc.text('Base Sludge Treatment Service:', 60, currentY);
      doc.font('Helvetica-Bold').text(`₹${quote.quotedAmount.toLocaleString('en-IN')}.00`, 380, currentY).font('Helvetica');
      currentY += 20;
    }

    // Divider
    doc.moveTo(40, currentY + 10).lineTo(555, currentY + 10).lineWidth(1.5).stroke('#1B5E20');

    // Total Amount
    doc.fillColor('#1B5E20')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('TOTAL QUOTED ESTIMATE (INR):', 60, currentY + 25);
    
    doc.fontSize(14)
       .text(`₹${quote.totalAmount.toLocaleString('en-IN')}.00`, 380, currentY + 23);

    // Terms note
    doc.fillColor('#757575')
       .fontSize(8.5)
       .font('Helvetica')
       .text('Note: This is an estimated quote based on volumetric septic sludge capacity. Terms apply.', 50, 750);

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error generating quote PDF.');
  }
});

// Dynamic Invoice PDF Builder
app.get('/api/invoice/pdf/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    const booking = await Booking.findById(bookingId).populate('propertyId');
    if (!booking) return res.status(404).send('Booking profile not found.');

    const quote = await Quote.findOne({ bookingId });
    if (!quote) return res.status(404).send('Service quote details not found.');

    const record = await ServiceRecord.findOne({ bookingId });
    if (!record) return res.status(404).send('Zero-waste completion records not ready.');

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Ecozza_Invoice_${bookingId.substring(0, 8)}.pdf`);
    doc.pipe(res);

    // Draw frame & centered logo
    drawDocumentFrame(doc, 'TAX INVOICE / BILL');

    // Client/Property Information
    doc.fillColor('#000000')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('BILLED TO:', 50, 195);
       
    doc.fillColor('#1B5E20')
       .fontSize(14)
       .text(booking.propertyId.name, 50, 212);

    const fullAddress = `${booking.propertyId.address}, ${booking.propertyId.city}, ${booking.propertyId.district}, ${booking.propertyId.state}`;
    doc.fillColor('#424242')
       .fontSize(10)
       .font('Helvetica')
       .text(fullAddress, 50, 232, { width: 300 });

    // Invoice details (right column)
    doc.fillColor('#000000')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text(`INVOICE NO: INV-${bookingId.substring(0, 8).toUpperCase()}`, 380, 195)
       .font('Helvetica')
       .text(`Date: ${record.completionDate}`, 380, 212)
       .text(`Booking Ref: EZ-${bookingId.substring(0, 8).toUpperCase()}`, 380, 229);

    // Divider
    doc.moveTo(40, 265).lineTo(555, 265).lineWidth(1).stroke('#E0E0E0');

    // Services Rendered
    doc.fillColor('#1B5E20')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('SERVICES RENDERED', 50, 285);

    doc.fillColor('#000000')
       .fontSize(10)
       .font('Helvetica');

    doc.text(`• Mobilized Sludge Pasteurization & Volume Extraction`, 60, 310);
    doc.text(`• Liquid Sludge Processed: ${record.wasteProcessedLiters.toLocaleString()} Liters`, 60, 327);
    doc.text(`• Organic Biochar Recovered: ${record.biocharProducedKg} kg`, 60, 344);
    doc.text(`• Water Recovered for Irrigation: ${record.waterRecoveredLiters.toLocaleString()} Liters`, 60, 361);

    // Divider
    doc.moveTo(40, 395).lineTo(555, 395).lineWidth(1).stroke('#E0E0E0');

    // Billing details
    doc.fillColor('#1B5E20')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('BILLING BREAKDOWN (INR)', 50, 415);

    doc.fillColor('#000000')
       .fontSize(10)
       .font('Helvetica');

    let currentY = 440;
    if (quote.dayRates && quote.dayRates.length > 0) {
      quote.dayRates.forEach(dr => {
        doc.text(`Day ${dr.dayNumber} Recovery Operations:`, 60, currentY);
        doc.font('Helvetica-Bold').text(`₹${dr.amount.toLocaleString('en-IN')}.00`, 380, currentY).font('Helvetica');
        currentY += 20;
      });
    } else {
      doc.text('On-Site Pasteurization Recovery Charge:', 60, currentY);
      doc.font('Helvetica-Bold').text(`₹${quote.quotedAmount.toLocaleString('en-IN')}.00`, 380, currentY).font('Helvetica');
      currentY += 20;
    }

    // Divider
    doc.moveTo(40, currentY + 10).lineTo(555, currentY + 10).lineWidth(1.5).stroke('#1B5E20');

    // Total Amount
    doc.fillColor('#1B5E20')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('NET PAYABLE DUE (PAID):', 60, currentY + 25);
    
    doc.fontSize(14)
       .text(`₹${quote.totalAmount.toLocaleString('en-IN')}.00`, 380, currentY + 23);

    // Green Stamp approved seal
    doc.save();
    doc.fillColor('#E8F5E9').circle(460, 650, 40).fill();
    doc.strokeColor('#2E7D32').lineWidth(2).circle(460, 650, 40).stroke();
    doc.restore();

    doc.fillColor('#2E7D32')
       .fontSize(9.5)
       .font('Helvetica-Bold')
       .text('PAID IN FULL', 432, 646);

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error generating invoice PDF.');
  }
});


// Start server listener
app.listen(PORT, () => {
  console.log(`Ecozza Green backend server running on port ${PORT}`);
});

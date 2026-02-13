const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const adminRoutes = require("./routes/admin");
const usersRoutes = require("./routes/users");
const orderRoutes = require("./routes/order");
const nodemailer = require('nodemailer');
const razorpayWebhookRouter = require('./routes/razorpayWebhook');
const facebookRateLimiter = require('./middlewares/facebookRateLimiter');


console.log('Admin routes loaded:', typeof adminRoutes);

// In-memory OTP store (for demo; switch to DB or cache in production)
const otpStore = {};

const fs = require("fs");
const path = require('path');
const { logger, logFilePath } = require("./utils/logger");

// Facebook SDK
const bizSdk = require('facebook-nodejs-business-sdk');

// in case uploads folder is not created
const uploadDir = path.join(__dirname, 'uploads', 'products');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// db connection
dotenv.config();
connectDB();

const app = express();

// ✅ FIXED: Enable JSON parsing for ALL HTTP methods including DELETE
app.use(express.json({ limit: '10mb', type: ['application/json', 'application/*+json', '*/*'] }));
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Add URL encoded support
app.use(cors());
app.set("trust proxy", true);
app.use('/uploads', express.static('uploads'));

// Facebook Pixel Configuration
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN || 'EAALZCy4qRZChgBQnIEuqLYN7UDEoRRAeAJoN59rycRA4K0Ga6eSf8EY2vdF2P8e6qTUm3aCdhIZBshxuM2qbicl9yCXHcCoBbh9jLINNaF3JaRwYYLIWQkzoVU147djADEiB9wZAyZCBZCdoOQgfZBJKWFx7mfksodmIE1cxlmWDUlgf8QzZBpijjcuPlzB2pEne1wZDZD';
const FACEBOOK_PIXEL_ID = process.env.FACEBOOK_PIXEL_ID || '1131280045595284';

// ==================== FACEBOOK CONVERSIONS API ====================

// Facebook Events API Endpoint
app.post('/api/facebook-events', facebookRateLimiter, async (req, res) => {
  try {
    console.log('📨 Received Facebook Event:', req.body.eventName);

    const {
      eventName,
      data,
      fbp,
      fbc,
      clientUserAgent,
    } = req.body;

    // Get client IP address
    const clientIp = req.headers['x-forwarded-for'] || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress || 
                     req.ip;

    // Create UserData object
    const userData = new bizSdk.UserData()
      .setClientIpAddress(clientIp)
      .setClientUserAgent(clientUserAgent || req.headers['user-agent']);

    // Add Facebook cookies if available
    if (fbp) userData.setFbp(fbp);
    if (fbc) userData.setFbc(fbc);

    // Add email if available (hashed)
    if (data.email) {
      const crypto = require('crypto');
      const hashedEmail = crypto
        .createHash('sha256')
        .update(data.email.toLowerCase().trim())
        .digest('hex');
      userData.setEmails([hashedEmail]);
    }

    // Add phone if available (hashed)
    if (data.phone) {
      const crypto = require('crypto');
      const hashedPhone = crypto
        .createHash('sha256')
        .update(data.phone.replace(/\D/g, ''))
        .digest('hex');
      userData.setPhones([hashedPhone]);
    }

    // Create CustomData object
    const customData = new bizSdk.CustomData()
      .setCurrency(data.currency || 'INR')
      .setValue(data.value || 0);

    // Add content details
    if (data.id) customData.setContentIds([data.id]);
    if (data.content_ids) customData.setContentIds(data.content_ids);
    if (data.name) customData.setContentName(data.name);
    if (data.category) customData.setContentType(data.category);
    if (data.num_items) customData.setNumItems(data.num_items);
    if (data.quantity) customData.setNumItems(data.quantity);

    // Create ServerEvent object
    const serverEvent = new bizSdk.ServerEvent()
      .setEventName(eventName)
      .setEventTime(data.eventTime || Math.floor(Date.now() / 1000))
      .setUserData(userData)
      .setCustomData(customData)
      .setActionSource('website');

    // Set event source URL
    if (data.eventSourceUrl) {
      serverEvent.setEventSourceUrl(data.eventSourceUrl);
    } else if (req.headers.referer) {
      serverEvent.setEventSourceUrl(req.headers.referer);
    } else {
      serverEvent.setEventSourceUrl('https://drbskhealthcare.com');
    }

    // Create EventRequest
    const eventsData = [serverEvent];
    const eventRequest = new bizSdk.EventRequest(FACEBOOK_ACCESS_TOKEN, FACEBOOK_PIXEL_ID)
      .setEvents(eventsData);

    // Execute the request
    const response = await eventRequest.execute();

    console.log(`✅ Facebook ${eventName} event sent successfully`);
    
    // Log for debugging
    logger.info('Facebook Event Sent', {
      eventName,
      contentName: data.name,
      value: data.value,
      currency: data.currency,
      userAgent: clientUserAgent?.substring(0, 50),
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: `Facebook ${eventName} event sent successfully`,
      eventId: response?.event_id || null
    });

  } catch (error) {
    console.error('❌ Facebook API Error:', error);
    
    logger.error('Facebook API Error', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send Facebook event'
    });
  }
});

// Add this with your other routes
const couponRoutes = require('./routes/couponRoutes');

// Use routes
app.use('/api/coupons', couponRoutes);

// Facebook Health Check
app.get('/api/facebook-events/health', (req, res) => {
  const healthStatus = {
    success: true,
    message: 'Facebook Conversions API is healthy',
    timestamp: new Date().toISOString(),
    facebookPixel: FACEBOOK_PIXEL_ID ? 'Configured' : 'Not configured',
    accessToken: FACEBOOK_ACCESS_TOKEN ? 'Configured' : 'Not configured'
  };
  
  console.log('🔍 Facebook API Health Check:', healthStatus);
  res.status(200).json(healthStatus);
});

// Test Facebook Event Endpoint
app.post('/api/test-facebook-event', async (req, res) => {
  try {
    const testEvent = {
      eventName: 'PageView',
      data: {
        id: 'test_home_page',
        name: 'Test Home Page',
        value: 0,
        currency: 'INR',
        category: 'Test',
        eventTime: Math.floor(Date.now() / 1000),
        eventSourceUrl: 'https://drbskhealthcare.com/test'
      },
      fbp: 'fb.1.1234567890.1234567890',
      fbc: 'fb.1.1234567890.1234567890',
      clientUserAgent: 'Mozilla/5.0 Test Browser'
    };

    const response = await fetch(`http://localhost:${process.env.PORT || 4000}/api/facebook-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testEvent)
    });

    const result = await response.json();
    
    res.json({
      message: 'Test event triggered',
      facebookResponse: result,
      testEvent
    });
  } catch (error) {
    res.status(500).json({
      error: 'Test failed',
      message: error.message
    });
  }
});

// ==================== EXISTING ROUTES ====================

// API routes
app.use("/admin", adminRoutes);
app.use("/user", usersRoutes);
app.use('/api', orderRoutes);
app.use('/webhook', razorpayWebhookRouter);

// --- New OTP Email Verification Routes ---

// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  }
});

// Endpoint to send OTP to email
app.post('/api/send-otp', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP with 5-minute expiry
  otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000 };

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      logger.error('Failed to send OTP email', { error: error.message, stack: error.stack });
      return res.status(500).json({ message: error.message });
    }
    logger.info('OTP email sent', { to: email });
    res.json({ message: 'OTP sent successfully' });
  });
});

// Endpoint to verify OTP with phone and save user
app.post('/api/verify-otp', async (req, res) => {
  const { email, otp, name, phone, password, address } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  const record = otpStore[email];
  if (!record) {
    return res.status(400).json({ message: 'OTP not found or expired, please request again' });
  }

  if (Date.now() > record.expires) {
    delete otpStore[email];
    return res.status(400).json({ message: 'OTP expired, please request again' });
  }

  if (record.otp !== otp) {
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  // Clear OTP from store
  delete otpStore[email];

  try {
    // Import Admin model at the top of your file 
    const Admin = require('./models/admin');
    const bcrypt = require('bcryptjs');

    // Check if user already exists
    let user = await Admin.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    user = await Admin.create({
      name,
      email,
      phone,
      password: hashedPassword,
      address: Array.isArray(address) ? address : [address],
      role: 'User',
      timeStamp: new Date().toISOString()
    });

    logger.info('User created successfully after OTP verification', { email });
    
    // Send Facebook registration event
    try {
      const facebookEventData = {
        eventName: 'CompleteRegistration',
        data: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          value: 0,
          currency: 'INR',
          category: 'User Registration',
          eventTime: Math.floor(Date.now() / 1000),
          eventSourceUrl: req.headers.referer || 'https://drbskhealthcare.com/register'
        },
        clientUserAgent: req.headers['user-agent']
      };

      // Send to Facebook API
      const facebookRes = await fetch(`http://localhost:${process.env.PORT || 4000}/api/facebook-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facebookEventData)
      });
      
      if (facebookRes.ok) {
        console.log('✅ Facebook registration event sent');
      }
    } catch (fbError) {
      console.error('Facebook event error:', fbError);
    }
    
    res.json({
      message: 'OTP verified and user created successfully',
      admin: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Error creating user after OTP verification', { error: error.message });
    res.status(500).json({ message: 'Error creating user after OTP verification' });
  }
});

// Logs API endpoint
app.get("/api/logs", (req, res) => {
  fs.readFile(logFilePath, "utf8", (err, data) => {
    if (err) {
      logger.error("Failed to read log file", { error: err.message });
      return res.status(500).json({ error: "Unable to read log file" });
    }
    const logs = data
      .split("\n")
      .filter(line => line.trim() !== "") // Exclude empty lines
      .map(line => JSON.parse(line)); // Parse JSON logs
    res.json(logs);
  });
});

// Facebook Logs endpoint
app.get("/api/facebook-logs", (req, res) => {
  const facebookLogsPath = path.join(__dirname, 'logs', 'facebook-events.log');
  
  if (!fs.existsSync(facebookLogsPath)) {
    return res.json([]);
  }
  
  fs.readFile(facebookLogsPath, "utf8", (err, data) => {
    if (err) {
      logger.error("Failed to read Facebook log file", { error: err.message });
      return res.status(500).json({ error: "Unable to read Facebook log file" });
    }
    const logs = data
      .split("\n")
      .filter(line => line.trim() !== "")
      .map(line => JSON.parse(line));
    res.json(logs);
  });
});

// Root endpoint
app.get('/', (req, res) => {
  const serverInfo = {
    name: 'Dr BSK Healthcare Backend',
    status: '✅ Running with HTTPS!',
    facebookApi: '✅ Facebook Conversions API Active',
    endpoints: {
      facebookEvents: '/api/facebook-events',
      facebookHealth: '/api/facebook-events/health',
      testEvent: '/api/test-facebook-event',
      otpSend: '/api/send-otp',
      otpVerify: '/api/verify-otp',
      logs: '/api/logs',
      facebookLogs: '/api/facebook-logs'
    },
    timestamp: new Date().toISOString()
  };
  res.json(serverInfo);
});

// Facebook Config endpoint
app.get('/api/facebook-config', (req, res) => {
  res.json({
    pixelId: FACEBOOK_PIXEL_ID,
    hasAccessToken: !!FACEBOOK_ACCESS_TOKEN,
    status: 'Configured',
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
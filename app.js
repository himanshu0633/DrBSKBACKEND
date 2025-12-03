// const express = require("express");
// const dotenv = require("dotenv");
// const cors = require("cors");
// const connectDB = require("./config/db");
// const adminRoutes = require("./routes/admin");
// const usersRoutes = require("./routes/users");
// const orderRoutes = require("./routes/order");
// // const support = require("./routes/support");
// // const cities = require("./routes/city");
// // const path = require("path");


// const fs = require("fs");
// const { logger, logFilePath } = require("./utils/logger");

// dotenv.config();
// connectDB();

// const app = express();
// app.use(express.json());
// app.use(cors());
// app.set("trust proxy", true);
// app.use('/uploads', express.static('uploads'));
// // app.use("/uploads", express.static(path.join(__dirname, "uploads")));




// // API routes
// app.use("/admin", adminRoutes);
// app.use("/user", usersRoutes);
// app.use('/api', orderRoutes);
// // app.use("/", support);
// // app.use("/", cities);


// // Logs API endpoint
// app.get("/api/logs", (req, res) => {
//   fs.readFile(logFilePath, "utf8", (err, data) => {
//     if (err) {
//       logger.error("Failed to read log file", { error: err.message });
//       return res.status(500).json({ error: "Unable to read log file" });
//     }
//     const logs = data
//       .split("\n")
//       .filter(line => line.trim() !== "") // Exclude empty lines
//       .map(line => JSON.parse(line)); // Parse JSON logs
//     res.json(logs);
//   });
// });


// app.get('/', (req, res) => {
//   res.send('✅ Dr BSK Healthcare backend is running with HTTPS!');
// });
// module.exports = app;


// 2: app.js with razorpay webhook integration
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const adminRoutes = require("./routes/admin");
const usersRoutes = require("./routes/users");
const orderRoutes = require("./routes/order");
const nodemailer = require('nodemailer');
const razorpayWebhookRouter = require('./routes/razorpayWebhook');

console.log('Admin routes loaded:', typeof adminRoutes);

// In-memory OTP store (for demo; switch to DB or cache in production)
const otpStore = {};

const fs = require("fs");
const path = require('path');
const { logger, logFilePath } = require("./utils/logger");


// in case uploads folder is not created
const uploadDir = path.join(__dirname, 'uploads', 'products');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// db connection
dotenv.config();
connectDB();

const app = express();
// app.use(express.json());
app.use(express.json({ limit: '10mb' }))

// const allowedOrigins = [
//   'https://drbskhealthcare.com',
//   'http://localhost:3000',
//   'https://fvvcbrpm-4000.inc1.devtunnels.ms',
// ];

// app.set('trust proxy', true);

// // Apply CORS middleware
// app.use(cors({
//   origin: (origin, cb) => {
//     if (!origin) return cb(null, true);
//     if (allowedOrigins.includes(origin)) {
//       return cb(null, true);
//     } else {
//       return cb(new Error('CORS policy: Origin not allowed'), false);
//     }
//   },
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true,
// }));

app.use(cors());
app.set("trust proxy", true);
app.use('/uploads', express.static('uploads'));


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
    // if (error) {
    //   logger.error('Failed to send OTP email', { error: error.message });
    //   return res.status(500).json({ message: 'Failed to send OTP' });
    // }
    if (error) {
      logger.error('Failed to send OTP email', { error: error.message, stack: error.stack });
      return res.status(500).json({ message: error.message });
    }
    logger.info('OTP email sent', { to: email });
    res.json({ message: 'OTP sent successfully' });
  });
});

// Endpoint to verify OTP
// option 1: without phone
// app.post('/api/verify-otp', (req, res) => {
//   const { email, otp } = req.body;
//   if (!email || !otp) {
//     return res.status(400).json({ message: 'Email and OTP are required' });
//   }

//   const record = otpStore[email];
//   if (!record) {
//     return res.status(400).json({ message: 'OTP not found or expired, please request again' });
//   }

//   if (Date.now() > record.expires) {
//     delete otpStore[email];
//     return res.status(400).json({ message: 'OTP expired, please request again' });
//   }

//   if (record.otp !== otp) {
//     return res.status(400).json({ message: 'Invalid OTP' });
//   }

//   // Successful verification
//   delete otpStore[email];
//   res.json({ message: 'OTP verified successfully' });
// });


// option 2: with phone and save user and otp verification
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

// debug log to check mongo is working or not:
// console.log('MongoDB URI:', process.env.MONGO_URI || 'Not set');

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


app.get('/', (req, res) => {
  res.send('✅ Dr BSK Healthcare backend is running with HTTPS!');
});
module.exports = app;


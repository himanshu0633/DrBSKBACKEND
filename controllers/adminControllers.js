const { logger } = require("../utils/logger");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const nodemailer = require("nodemailer");
const Admin = require("../models/admin");
const WholesalePartner = require("../models/wholeSale");
const crypto = require('crypto');
const Order = require("../models/order");
const mongoose = require('mongoose');
require("dotenv").config();

// OTP Model (यह अलग file में होना चाहिए, लेकिन temporary यहाँ define कर रहे हैं)
const otpSchema = new mongoose.Schema({
  email: { type: String, required: false },
  phone: { type: String, required: false },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  verified: { type: Boolean, default: false },
  type: { type: String, enum: ['email', 'phone'], required: true }
}, { timestamps: true });

// Add indexes
otpSchema.index({ email: 1, phone: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP = mongoose.models.OTP || mongoose.model('OTP', otpSchema);

const findUser = async (email) => {
  const admin = await Admin.findOne({ email });
  if (admin) return { type: "admins", user: admin };
  return null;
};

// Send OTP function
const sendOtp = async (req, res) => {
  try {
    const { email, phone } = req.body;
    
    if (!email && !phone) {
      return res.status(400).json({ message: 'Email or phone is required' });
    }
    
    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Set expiry to 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    let otpRecord;
    
    if (email) {
      // Check if user exists
      let user = await Admin.findOne({ email });
      if (!user) {
        user = await WholesalePartner.findOne({ billingEmail: email });
        if (!user) {
          return res.status(404).json({ message: 'Email not registered' });
        }
      }
      
      // Delete previous OTPs for this email
      await OTP.deleteMany({ email });
      
      // Create new OTP record
      otpRecord = await OTP.create({
        email,
        otp,
        expiresAt,
        type: 'email'
      });
      
      // Send OTP via email
      await sendEmailOtp(email, otp);
      
    } else if (phone) {
      // Check if user exists with this phone
      let user = await Admin.findOne({ phone });
      if (!user) {
        user = await WholesalePartner.findOne({ phone: phone });
        if (!user) {
          return res.status(404).json({ message: 'Phone number not registered' });
        }
      }
      
      // Delete previous OTPs for this phone
      await OTP.deleteMany({ phone });
      
      // Create new OTP record
      otpRecord = await OTP.create({
        phone,
        otp,
        expiresAt,
        type: 'phone'
      });
      
      // Send OTP via SMS (you'll need to implement this)
      await sendSmsOtp(phone, otp);
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'OTP sent successfully',
      // In development, you might want to return OTP for testing
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
    
  } catch (error) {
    logger.error("Error sending OTP:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

// Email sending function
const sendEmailOtp = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Your OTP for Login ',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Login OTP</h2>
          <p>Your OTP for login is:</p>
          <div style="background-color: #f4f4f4; padding: 10px; border-radius: 5px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center;">
            ${otp}
          </div>
          <p>This OTP is valid for 10 minutes.</p>
          <p>If you didn't request this OTP, please ignore this email.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    logger.info(`OTP email sent to ${email}`);
    
  } catch (error) {
    logger.error("Error sending email OTP:", error);
    throw error;
  }
};

// SMS sending function (placeholder)
const sendSmsOtp = async (phone, otp) => {
  // Implement SMS sending logic here
  logger.info(`OTP for phone ${phone}: ${otp}`);
  return Promise.resolve();
};

const loginWithOtp = async (req, res) => {
  try {
    const { email, phone, otp } = req.body;
    
    if ((!email && !phone) || !otp) {
      return res.status(400).json({ 
        message: 'Email/phone and OTP are required' 
      });
    }
    
    // Find OTP record
    let otpRecord;
    if (email) {
      otpRecord = await OTP.findOne({ 
        email, 
        otp,
        verified: false 
      });
    } else {
      otpRecord = await OTP.findOne({ 
        phone, 
        otp,
        verified: false 
      });
    }
    
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    
    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      return res.status(400).json({ message: 'OTP has expired' });
    }
    
    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();
    
    // Find user
    let user, type;
    if (email) {
      user = await Admin.findOne({ email });
      type = 'admin';
      
      if (!user) {
        user = await WholesalePartner.findOne({ billingEmail: email });
        type = 'wholesalePartner';
      }
    } else {
      user = await Admin.findOne({ phone });
      type = 'admin';
      
      if (!user) {
        user = await WholesalePartner.findOne({ phone });
        type = 'wholesalePartner';
      }
    }
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email || user.billingEmail, 
        phone: user.phone,
        type 
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    
    const timestamp = new Date().toISOString();
    
    // Link guest orders (for email login only)
    let linkedOrdersCount = 0;
    if (email && type === 'admin') {
      const guestOrders = await Order.find({
        $or: [
          { email: { $regex: new RegExp(`^${email}$`, 'i') } },
          { userEmail: { $regex: new RegExp(`^${email}$`, 'i') } }
        ],
        $or: [
          { userId: { $exists: false } },
          { userId: null }
        ]
      });

      if (guestOrders.length > 0) {
        const result = await Order.updateMany(
          {
            _id: { $in: guestOrders.map(order => order._id) }
          },
          {
            $set: { 
              userId: user._id,
              isGuest: false
            }
          }
        );
        linkedOrdersCount = result.modifiedCount;
      }
      
      // Update login metadata
      await Admin.updateOne(
        { _id: user._id },
        { 
          timeStamp: timestamp,
          lastLogin: new Date()
        },
        { new: true }
      );
    }
    
    logger.info(`${type} logged in with OTP successfully${linkedOrdersCount > 0 ? ` - ${linkedOrdersCount} guest orders linked` : ''}`);
    
    const responseData = {
      status: "success",
      message: "Login successful",
      token,
      data: {
        ...user._doc,
        timeStamp: timestamp,
        type
      }
    };
    
    if (linkedOrdersCount > 0) {
      responseData.guestOrdersLinked = linkedOrdersCount;
      responseData.message = `Login successful! ${linkedOrdersCount} previous guest orders linked to your account.`;
    }
    
    res.json(responseData);
    
  } catch (error) {
    logger.error("Error during OTP login:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit (in bytes)
}).single('image');

// Add error handling for file size
const handleFileSizeError = (err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: "File size exceeds 1MB limit" });
  }
  next(err);
};

// Old password login function (optional - remove if not needed)
const adminLogin = async (req, res) => {
  try {
    const { email, password, location, ipAddress, phone } = req.body;

    // Check if user exists
    let user = await Admin.findOne({ email });
    let type = 'admin';

    if (!user) {
      user = await WholesalePartner.findOne({ billingEmail: email });
      type = 'wholesalePartner';
    }

    if (!user) {
      return res.status(404).json({ message: "Invalid email" });
    }

    // Check if password exists
    if (!user.password) {
      return res.status(400).json({ 
        message: "Password login not available. Please use OTP login." 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email || user.billingEmail, type },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    const timestamp = new Date().toISOString();
    const geoLocation = location || "Unknown location";
    const userIp = ipAddress || "Unknown IP";

    // ✅ CRITICAL: Link guest orders to this user
    let linkedOrdersCount = 0;
    if (type === 'admin') {
      // Find all guest orders with this email
      const guestOrders = await Order.find({
        $or: [
          { email: { $regex: new RegExp(`^${email}$`, 'i') } },
          { userEmail: { $regex: new RegExp(`^${email}$`, 'i') } }
        ],
        $or: [
          { userId: { $exists: false } },
          { userId: null }
        ]
      });

      if (guestOrders.length > 0) {
        // Update all guest orders with userId
        const result = await Order.updateMany(
          {
            _id: { $in: guestOrders.map(order => order._id) }
          },
          {
            $set: { 
              userId: user._id,
              isGuest: false
            }
          }
        );
        linkedOrdersCount = result.modifiedCount;
      }
      
      // Update login metadata
      await Admin.updateOne(
        { _id: user._id },
        { ipAddress: userIp, timeStamp: timestamp, location: geoLocation, phone },
        { new: true }
      );
    }

    logger.info(`${type} logged in with password successfully${linkedOrdersCount > 0 ? ` - ${linkedOrdersCount} guest orders linked` : ''}`);

    // Response prepare करें
    const responseData = {
      status: "success",
      message: "Login successful",
      token,
      data: {
        ...user._doc,
        ipAddress: userIp,
        timeStamp: timestamp,
        location: geoLocation,
        type,
        phone: user.phone,
      }
    };

    // ✅ Add guest orders linking info to response
    if (linkedOrdersCount > 0) {
      responseData.guestOrdersLinked = linkedOrdersCount;
      responseData.message = `Login successful! ${linkedOrdersCount} previous guest orders linked to your account.`;
    }

    res.json(responseData);
    
  } catch (error) {
    logger.error("Error during login:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const createAdmin = async (req, res) => {
  try {
    let { email, name, phone, address, location, role = "User", password } = req.body;
    if (typeof address === "string") {
      address = [address];
    }

    const image = req.file ? req.file.filename : null;

    // Password is now optional for OTP login
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const timeStamp = new Date().toISOString();

    // Create new admin
    const admin = await Admin.create({
      email,
      password: hashedPassword, // Can be null for OTP-only users
      name,
      phone,
      address,
      location,
      image,
      role,
      timeStamp,
    });

    // ✅ CRITICAL: Link guest orders to new user account
    let linkedOrdersCount = 0;
    const guestOrders = await Order.find({
      $or: [
        { email: { $regex: new RegExp(`^${email}$`, 'i') } },
        { userEmail: { $regex: new RegExp(`^${email}$`, 'i') } }
      ],
      $or: [
        { userId: { $exists: false } },
        { userId: null }
      ]
    });

    if (guestOrders.length > 0) {
      const result = await Order.updateMany(
        {
          _id: { $in: guestOrders.map(order => order._id) }
        },
        {
          $set: { 
            userId: admin._id,
            isGuest: false
          }
        }
      );
      linkedOrdersCount = result.modifiedCount;
    }

    // Send OTP for first time verification
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    await OTP.create({
      email,
      otp,
      expiresAt,
      type: 'email'
    });
    
    await sendEmailOtp(email, otp);

    logger.info("Admin created successfully with OTP sent");

    const responseData = {
      message: "Admin created successfully. OTP sent to email for verification.",
      data: admin,
      otpSent: true
    };

    // ✅ Add guest orders linking info
    if (linkedOrdersCount > 0) {
      responseData.guestOrdersLinked = linkedOrdersCount;
      responseData.message = `Account created! ${linkedOrdersCount} previous guest orders linked to your account. OTP sent for verification.`;
    }

    res.status(201).json(responseData);
    
  } catch (error) {
    logger.error("Error creating admin:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    let { name, phone, address, location, email, password, role } = req.body;
    if (typeof address === "string") {
      address = [address];
    }

    const image = req.file ? req.file.filename : null;

    const updateData = {
      name,
      phone,
      address,
      location,
      email,
      role,
      timeStamp: new Date().toISOString(),
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    if (image) {
      updateData.image = image;
    }

    const admin = await Admin.findByIdAndUpdate(id, updateData, { new: true });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    logger.info("Admin updated successfully");
    res.status(200).json({ message: "Admin updated successfully", admin });
  } catch (error) {
    logger.error("Error updating admin:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const readAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    res.status(200).json({ data: admin });
  } catch (error) {
    logger.error("Error reading admin:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findByIdAndUpdate(
      id,
      { deleted_at: new Date() },
      { new: true }
    );

    if (!admin) return res.status(404).json({ message: "Admin not found" });

    logger.info("Admin deleted successfully");
    res.status(200).json({ message: "Admin deleted successfully" });
  } catch (error) {
    logger.error("Error deleting admin:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const readAllAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.max(1, parseInt(limit, 10) || 10);

    const searchFilter = {
      deleted_at: null,
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { address: { $elemMatch: { $regex: search, $options: "i" } } },
      ],
    };

    const totalCount = await Admin.countDocuments(searchFilter);

    const admins = await Admin.find(searchFilter)
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    res.status(200).json({
      data: admins,
      totalCount,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalCount / limitNumber),
    });
  } catch (error) {
    logger.error("Error reading Admin:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getImage = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, "../uploads", filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "Image not found" });
    }
  } catch (error) {
    logger.error("Error fetching image:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getAdminCount = async (req, res) => {
  try {
    // Get count of admins not marked as deleted
    const count = await Admin.countDocuments({ deleted_at: null });

    // Get only the created_at dates, exclude _id
    const admins = await Admin.find({ deleted_at: null }).select({ createdAt: 1, _id: 0 });

    res.status(200).json({
      totalAdmins: count,
      createdDates: admins,  // More descriptive key name
    });
  } catch (error) {
    logger.error("Error fetching admin data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  createAdmin: [upload, handleFileSizeError, createAdmin],
  updateAdmin: [upload, handleFileSizeError, updateAdmin],
  readAdmin,
  deleteAdmin,
  readAllAdmins,
  getImage,
  adminLogin,
  loginWithOtp,
  sendOtp,
  getAdminCount,
};
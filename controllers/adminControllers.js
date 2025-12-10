const { logger } = require("../utils/logger");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const nodemailer = require("nodemailer");
const Admin = require("../models/admin");
const WholesalePartner = require("../models/wholeSale");
const Order = require("../models/order");
require("dotenv").config();


const findUser = async (email) => {
  const admin = await Admin.findOne({ email });
  if (admin) return { type: "admins", user: admin };
  return null;
};




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



// Admin model import करें


// adminLogin function update करें:
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

    logger.info(`${type} logged in successfully${linkedOrdersCount > 0 ? ` - ${linkedOrdersCount} guest orders linked` : ''}`);

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

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const timeStamp = new Date().toISOString();

    // Create new admin
    const admin = await Admin.create({
      email,
      password: hashedPassword,
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

    // Create token
    const token = jwt.sign(
      { id: admin._id, email: admin.email, type: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    logger.info("Admin created successfully");

    // Response prepare करें
    const responseData = {
      message: "Admin created successfully",
      token,
      data: admin
    };

    // ✅ Add guest orders linking info
    if (linkedOrdersCount > 0) {
      responseData.guestOrdersLinked = linkedOrdersCount;
      responseData.message = `Account created! ${linkedOrdersCount} previous guest orders linked to your account.`;
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
    // const { name, phone, address, location, email, password, role } = req.body;
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
  getAdminCount,
};


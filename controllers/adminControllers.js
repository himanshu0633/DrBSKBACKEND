const { logger } = require("../utils/logger");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const nodemailer = require("nodemailer");
const Admin = require("../models/admin");
const WholesalePartner = require("../models/wholeSale");

require("dotenv").config();


const findUser = async (email) => {
  const admin = await Admin.findOne({ email });
  if (admin) return { type: "admins", user: admin };
  return null;
};


// const DEFAULT_PASSWORD = "Admin@123";

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASSWORD,
//   },
// });


// const forgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;

//     const admin = await Admin.findUser({ email });
//     if (!admin) {
//       return res.status(404).json({ message: "Email not found" });
//     }

//     // Generate OTP
//     const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
//     const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes from now

//     // Save OTP and expiry to the database
//     admin.otp = otp;
//     admin.otpExpiry = otpExpiry;
//     await admin.save();

//     // Send OTP via email
//     const mailOptions = {
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: "Password Reset OTP",
//       text: `Your OTP for resetting your password is ${otp}. This OTP will expire in 10 minutes.`,
//     };

//     await transporter.sendMail(mailOptions);

//     logger.info(`OTP sent to ${email}`);
//     res.status(200).json({ message: "OTP sent to your email" });
//   } catch (error) {
//     logger.error("Error during forgot password:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// const verifyOTP = async (req, res) => {
//   try {
//     const { email, otp } = req.body;

//     const result = await findUser(email);
//     if (!result) {
//       return res.status(404).json({ message: "Email not found" });
//     }

//     const { type, user } = result;

//     if (!user.otp || !user.otpExpiry) {
//       return res.status(400).json({ message: "No OTP found for this email" });
//     }

//     if (Date.now() > user.otpExpiry) {
//       return res.status(400).json({ message: "OTP has expired" });
//     }

//     if (parseInt(otp, 10) !== user.otp) {
//       return res.status(400).json({ message: "Invalid OTP" });
//     }

//     // Clear OTP and expiry after successful verification
//     user.otp = null;
//     user.otpExpiry = null;
//     await user.save();

//     logger.info("OTP verified successfully");
//     res.status(200).json({ message: "OTP verified successfully" });
//   } catch (error) {
//     logger.error("Error during OTP verification:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// const updatePassword = async (req, res) => {
//   try {
//     const { email, oldPassword, newPassword } = req.body;

//     if (!email || !newPassword) {
//       return res
//         .status(400)
//         .json({ message: "Email and new password are required" });
//     }

//     const result = await findUser(email);
//     if (!result) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const { type, user } = result;

//     if (oldPassword) {
//       const isOldPasswordValid = await bcrypt.compare(
//         oldPassword,
//         user.password
//       );
//       if (!isOldPasswordValid) {
//         return res.status(400).json({ message: "Old password is incorrect" });
//       }
//     }

//     const hashedNewPassword = await bcrypt.hash(newPassword, 10);
//     user.password = hashedNewPassword;
//     await user.save();

//     const mailOptions = {
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: "Password Updated Successfully",
//       text: `Your password has been successfully updated.`,
//     };

//     await transporter.sendMail(mailOptions);

//     logger.info("Password updated successfully and email notification sent");
//     res
//       .status(200)
//       .json({ message: "Password updated successfully and email sent" });
//   } catch (error) {
//     logger.error("Error updating password:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

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

    // Update login metadata (only for Admins for now)
    if (type === 'admin') {
      await Admin.updateOne(
        { _id: user._id },
        { ipAddress: userIp, timeStamp: timestamp, location: geoLocation, phone },
        { new: true }
      );
    }

    logger.info(`${type} logged in successfully`);

    res.json({
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
      },
    });
  } catch (error) {
    logger.error("Error during login:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


const createAdmin = async (req, res) => {
  try {
    // const { email, name, phone, address, location, role = "User", password } = req.body;
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

    logger.info("Admin created successfully");
    res.status(201).json({ message: "Admin created successfully", admin });
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


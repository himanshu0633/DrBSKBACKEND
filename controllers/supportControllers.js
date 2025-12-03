// const Support = require("../models/support");
// const { logger } = require("../utils/logger");
// const nodemailer = require("nodemailer");
// require("dotenv").config();



// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER, 
//     pass: process.env.EMAIL_PASSWORD, 
//   },
// });

// const createSupport = async (req, res) => {
//   try {
//     const { email, name, phone, description } = req.body;

//     const support = await Support.create({
//       email,
//       name,
//       phone,
//       description,
//       deleted_at: null,
//     });

//     logger.info("Support request created successfully");

//     const mailOptions = {
//       from: process.env.EMAIL_USER, // Sender address
//       to: email, // Recipient's email address
//       subject: "Support Request Received",
//       text: `Hello ${name},\n\nThank you for reaching out to us. We have received your request and will contact you soon.\n\nBest regards,\nSecurity Management Team`,
//     };

//     transporter.sendMail(mailOptions, (err, info) => {
//       if (err) {
//         logger.error("Error sending acknowledgment email:", err);
//       } else {
//         logger.info("Acknowledgment email sent:", info.response);
//       }
//     });

//     res
//       .status(201)
//       .json({ message: "Support request created successfully", support });
//   } catch (error) {
//     logger.error("Error creating support request:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// const updateSupport = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { email, name, phone, description } = req.body;

//     const updateData = {
//       email,
//       name,
//       phone,
//       description,
//     };

//     const support = await Support.findByIdAndUpdate(id, updateData, {
//       new: true,
//     });
//     if (!support)
//       return res.status(404).json({ message: "Support request not found" });

//     logger.info("Support request updated successfully");
//     res
//       .status(200)
//       .json({ message: "Support request updated successfully", support });
//   } catch (error) {
//     logger.error("Error updating support request:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// const readSupport = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const support = await Support.findOne({ _id: id, deleted_at: null });
//     if (!support)
//       return res.status(404).json({ message: "Support request not found" });
//     res.status(200).json({ data: support });
//   } catch (error) {
//     logger.error("Error reading support request:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// const deleteSupport = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const support = await Support.findByIdAndUpdate(
//       id,
//       { deleted_at: new Date() },
//       { new: true }
//     );

//     if (!support)
//       return res.status(404).json({ message: "Support request not found" });

//     logger.info("Support request deleted successfully");
//     res.status(200).json({ message: "Support request deleted successfully" });
//   } catch (error) {
//     logger.error("Error deleting support request:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// const readAllSupport = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, search = "" } = req.body;

//     const pageNumber = parseInt(page, 10);
//     const limitNumber = parseInt(limit, 10);

//     const searchFilter = {
//       deleted_at: null,
//       $or: [
//         { email: { $regex: search, $options: "i" } },
//         { name: { $regex: search, $options: "i" } },
//         { phone: { $regex: search, $options: "i" } },
//         { description: { $regex: search, $options: "i" } },
//       ],
//     };

//     const totalCount = await Support.countDocuments(searchFilter);

//     const supports = await Support.find(searchFilter)
//       .skip((pageNumber - 1) * limitNumber)
//       .limit(limitNumber);

//     res.status(200).json({
//       data: supports,
//       totalCount,
//       currentPage: pageNumber,
//       totalPages: Math.ceil(totalCount / limitNumber),
//     });
//   } catch (error) {
//     logger.error("Error reading support requests:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// module.exports = {
//   createSupport,
//   updateSupport,
//   readSupport,
//   deleteSupport,
//   readAllSupport,
// };

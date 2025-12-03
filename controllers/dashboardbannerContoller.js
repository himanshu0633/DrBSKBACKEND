// const DashboardBanner = require("../models/banner"); // Adjust path as needed
// const { logger } = require("../utils/logger");

// // Create a new Dashboard Banner
// exports.createDashboardBanner = async (req, res) => {
//   try {
//     const banner = new DashboardBanner(req.body);
//     const savedBanner = await banner.save();
//     logger.info(`Dashboard Banner created: ${savedBanner._id}`);
//     res.status(201).json(savedBanner);
//   } catch (error) {
//     logger.error("Error creating Dashboard Banner:", error);
//     res.status(400).json({ message: error.message });
//   }
// };

// // Get all Dashboard Banners
// exports.getAllDashboardBanners = async (req, res) => {
//   try {
//     const banners = await DashboardBanner.find({ deleted_at: null });
//     logger.info(`Fetched ${banners.length} dashboard banners`);
//     res.status(200).json(banners);
//   } catch (error) {
//     logger.error("Error fetching Dashboard Banners:", error);
//     res.status(500).json({ message: error.message });
//   }
// };

// // Get a single Dashboard Banner by ID
// exports.getDashboardBannerById = async (req, res) => {
//   try {
//     const banner = await DashboardBanner.findOne({
//       _id: req.params.id,
//       deleted_at: null,
//     });

//     if (!banner) {
//       logger.warn(`Dashboard Banner not found with ID: ${req.params.id}`);
//       return res.status(404).json({ message: "Banner not found" });
//     }

//     logger.info(`Dashboard Banner retrieved: ${banner._id}`);
//     res.status(200).json(banner);
//   } catch (error) {
//     logger.error(`Error fetching Dashboard Banner by ID (${req.params.id}):`, error);
//     res.status(500).json({ message: error.message });
//   }
// };

// // Update a Dashboard Banner
// exports.updateDashboardBanner = async (req, res) => {
//   try {
//     const updatedBanner = await DashboardBanner.findByIdAndUpdate(
//       req.params.id,
//       { ...req.body, updatedAt: Date.now() },
//       { new: true }
//     );

//     if (!updatedBanner) {
//       logger.warn(`Dashboard Banner not found for update: ${req.params.id}`);
//       return res.status(404).json({ message: "Banner not found" });
//     }

//     logger.info(`Dashboard Banner updated: ${updatedBanner._id}`);
//     res.status(200).json(updatedBanner);
//   } catch (error) {
//     logger.error(`Error updating Dashboard Banner (${req.params.id}):`, error);
//     res.status(400).json({ message: error.message });
//   }
// };

// // Soft delete a Dashboard Banner
// exports.deleteDashboardBanner = async (req, res) => {
//   try {
//     const deletedBanner = await DashboardBanner.findByIdAndUpdate(
//       req.params.id,
//       { deleted_at: new Date() },
//       { new: true }
//     );

//     if (!deletedBanner) {
//       logger.warn(`Dashboard Banner not found for deletion: ${req.params.id}`);
//       return res.status(404).json({ message: "Banner not found" });
//     }

//     logger.info(`Dashboard Banner soft-deleted: ${deletedBanner._id}`);
//     res.status(200).json({ message: "Banner deleted successfully" });
//   } catch (error) {
//     logger.error(`Error deleting Dashboard Banner (${req.params.id}):`, error);
//     res.status(500).json({ message: error.message });
//   }
// };

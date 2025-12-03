const Prescription = require("../models/prescription");
const { logger } = require("../utils/logger");

// Create a new prescription
exports.createPrescription = async (req, res) => {
  try {
    const imagePath = req.file ? req.file.path : null;

    const prescription = new Prescription({
      ...req.body,
      image: imagePath,
    });

    const savedPrescription = await prescription.save();
    logger.info(`Prescription created: ${savedPrescription._id}`);
    res.status(201).json(savedPrescription);
  } catch (error) {
    logger.error("Error creating prescription:", error);
    res.status(400).json({ message: error.message });
  }
};

// Get all prescriptions (excluding soft deleted)
exports.getPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.find({ deleted_at: null });
    logger.info("Fetched prescriptions");
    res.status(200).json(prescriptions);
  } catch (error) {
    logger.error("Error fetching prescriptions:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get prescription by ID
exports.getPrescriptionById = async (req, res) => {
  try {
    const prescription = await Prescription.findOne({
      _id: req.params.id,
      deleted_at: null,
    });

    if (!prescription) {
      logger.warn(`Prescription not found: ${req.params.id}`);
      return res.status(404).json({ message: "Prescription not found" });
    }

    logger.info(`Fetched prescription: ${prescription._id}`);
    res.status(200).json(prescription);
  } catch (error) {
    logger.error("Error fetching prescription by ID:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update prescription
exports.updatePrescription = async (req, res) => {
  try {
    const imagePath = req.file ? req.file.path : undefined;

    const updateData = { ...req.body };
    if (imagePath !== undefined) updateData.image = imagePath;

    const updatedPrescription = await Prescription.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      updateData,
      { new: true }
    );

    if (!updatedPrescription) {
      logger.warn(`Prescription not found for update: ${req.params.id}`);
      return res.status(404).json({ message: "Prescription not found or deleted" });
    }

    logger.info(`Prescription updated: ${updatedPrescription._id}`);
    res.status(200).json(updatedPrescription);
  } catch (error) {
    logger.error("Error updating prescription:", error);
    res.status(500).json({ message: error.message });
  }
};

// Soft delete prescription
exports.deletePrescription = async (req, res) => {
  try {
    const deletedPrescription = await Prescription.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { deleted_at: new Date() },
      { new: true }
    );

    if (!deletedPrescription) {
      logger.warn(`Prescription not found for deletion: ${req.params.id}`);
      return res.status(404).json({ message: "Prescription not found or already deleted" });
    }

    logger.info(`Prescription soft deleted: ${deletedPrescription._id}`);
    res.status(200).json({ message: "Prescription soft deleted" });
  } catch (error) {
    logger.error("Error deleting prescription:", error);
    res.status(500).json({ message: error.message });
  }
};

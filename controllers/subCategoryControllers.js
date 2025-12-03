const SubCategory = require("../models/subCategory"); // make sure the path is correct
const { logger } = require("../utils/logger");

// Create a new subcategory
exports.createSubCategory = async (req, res) => {
  try {
    const imagePath = req.file ? req.file.path : null;

    const subCategory = new SubCategory({
      ...req.body,
      image: imagePath,
    });

    const savedSubCategory = await subCategory.save();
    logger.info(`SubCategory created: ${savedSubCategory._id}`);
    res.status(201).json(savedSubCategory);
  } catch (error) {
    logger.error("Error creating subcategory:", error);
    res.status(400).json({ message: error.message });
  }
};


// Get all subcategories
exports.getAllSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find({ deleted_at: null }).populate("category_id");

    logger.info(`Fetched ${subCategories.length} subcategories`);
    res.status(200).json(subCategories);
  } catch (error) {
    logger.error("Error fetching all subcategories:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get a single subcategory by ID
exports.getSubCategoryById = async (req, res) => {
  try {
    const subCategory = await SubCategory.findOne({
      _id: req.params.id,
      deleted_at: null,
    }).populate("category_id");

    if (!subCategory) {
      logger.warn(`SubCategory not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: "SubCategory not found" });
    }

    logger.info(`SubCategory retrieved: ${subCategory._id}`);
    res.status(200).json(subCategory);
  } catch (error) {
    logger.error(`Error fetching subcategory by ID (${req.params.id}):`, error);
    res.status(500).json({ message: error.message });
  }
};

// Update a subcategory
exports.updateSubCategory = async (req, res) => {
  try {
    const updatedSubCategory = await SubCategory.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );

    if (!updatedSubCategory) {
      logger.warn(`SubCategory not found for update: ${req.params.id}`);
      return res.status(404).json({ message: "SubCategory not found" });
    }

    logger.info(`SubCategory updated: ${updatedSubCategory._id}`);
    res.status(200).json(updatedSubCategory);
  } catch (error) {
    logger.error(`Error updating subcategory (${req.params.id}):`, error);
    res.status(400).json({ message: error.message });
  }
};

// Soft delete a subcategory
exports.deleteSubCategory = async (req, res) => {
  try {
    const deletedSubCategory = await SubCategory.findByIdAndUpdate(
      req.params.id,
      { deleted_at: new Date() },
      { new: true }
    );

    if (!deletedSubCategory) {
      logger.warn(`SubCategory not found for deletion: ${req.params.id}`);
      return res.status(404).json({ message: "SubCategory not found" });
    }

    logger.info(`SubCategory soft-deleted: ${deletedSubCategory._id}`);
    res.status(200).json({ message: "SubCategory deleted successfully" });
  } catch (error) {
    logger.error(`Error deleting subcategory (${req.params.id}):`, error);
    res.status(500).json({ message: error.message });
  }
};

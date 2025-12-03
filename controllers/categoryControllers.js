const Category = require("../models/category");
const { logger } = require("../utils/logger");

// Create a new category

// Create a new category with image
exports.createCategory = async (req, res) => {
  try {
    const imagePath = req.file ? req.file.path : null;

    const category = new Category({
      ...req.body,
      image: imagePath,
    });

    const savedCategory = await category.save();
    logger.info(`Category created: ${savedCategory._id}`);
    res.status(201).json(savedCategory);
  } catch (error) {
    logger.error("Error creating category:", error);
    res.status(400).json({ message: error.message });
  }
};

// Update a category (including image)
exports.updateCategory = async (req, res) => {
  try {
    const imagePath = req.file ? req.file.path : undefined;

    const updateData = {
      ...req.body,
      updatedAt: Date.now(),
    };

    if (imagePath) {
      updateData.image = imagePath;
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedCategory) {
      logger.warn(`Category not found for update: ${req.params.id}`);
      return res.status(404).json({ message: "Category not found" });
    }

    logger.info(`Category updated: ${updatedCategory._id}`);
    res.status(200).json(updatedCategory);
  } catch (error) {
    logger.error(`Error updating category (${req.params.id}):`, error);
    res.status(400).json({ message: error.message });
  }
};


// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find({ deleted_at: null });

    logger.info(`Fetched ${categories.length} categories`);
    res.status(200).json(categories);
  } catch (error) {
    logger.error("Error fetching all categories:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get a single category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      deleted_at: null,
    });

    if (!category) {
      logger.warn(`Category not found with ID: ${req.params.id}`);
      return res.status(404).json({ message: "Category not found" });
    }

    logger.info(`Category retrieved: ${category._id}`);
    res.status(200).json(category);
  } catch (error) {
    logger.error(`Error fetching category by ID (${req.params.id}):`, error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const deletedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { deleted_at: new Date() },
      { new: true }
    );

    if (!deletedCategory) {
      logger.warn(`Category not found for deletion: ${req.params.id}`);
      return res.status(404).json({ message: "Category not found" });
    }

    logger.info(`Category soft-deleted: ${deletedCategory._id}`);
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    logger.error(`Error deleting category (${req.params.id}):`, error);
    res.status(500).json({ message: error.message });
  }
};

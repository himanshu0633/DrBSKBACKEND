const SubCategory = require("../models/subCategory");
const { logger } = require("../utils/logger");
const fs = require('fs');
const path = require('path');

console.log('🔵 [BACKEND] 🔥 SubCategory Controller Loaded');

// Create a new subcategory
exports.createSubCategory = async (req, res) => {
  try {
    console.log("\n=== CREATE SUBCATEGORY DEBUG ===");
    console.log("1. Request body:", req.body);
    console.log("2. Request file:", req.file);
    console.log("3. Content-Type:", req.headers['content-type']);
    
    const imagePath = req.file ? req.file.path : null;
    console.log("4. Image path being saved:", imagePath);

    // Log all fields being sent
    console.log("5. Fields to save:", {
      name: req.body.name,
      description: req.body.description,
      category_id: req.body.category_id,
      subCategoryvariety: req.body.subCategoryvariety,
      image: imagePath
    });

    // Validate required fields
    if (!req.body.name || !req.body.category_id || !req.body.subCategoryvariety) {
      console.log("6. Validation failed - missing required fields");
      return res.status(400).json({ 
        message: "Missing required fields",
        required: ["name", "category_id", "subCategoryvariety"],
        received: {
          name: !!req.body.name,
          category_id: !!req.body.category_id,
          subCategoryvariety: !!req.body.subCategoryvariety
        }
      });
    }

    const subCategory = new SubCategory({
      name: req.body.name,
      description: req.body.description || '',
      category_id: req.body.category_id,
      subCategoryvariety: req.body.subCategoryvariety,
      image: imagePath,
    });

    console.log("7. SubCategory object before save:", subCategory);
    
    const savedSubCategory = await subCategory.save();
    console.log("8. Saved subcategory:", savedSubCategory);
    
    logger.info(`SubCategory created: ${savedSubCategory._id}`);
    res.status(201).json(savedSubCategory);
  } catch (error) {
    console.error("CREATE ERROR:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    if (error.errors) {
      console.error("Validation errors:", error.errors);
    }
    logger.error("Error creating subcategory:", error);
    res.status(400).json({ 
      message: error.message,
      errors: error.errors 
    });
  }
};

// Update a subcategory - FIXED VERSION WITH VALIDATION
// Update a subcategory - COMPLETELY FIXED VERSION
exports.updateSubCategory = async (req, res) => {
  try {
    console.log("\n=== UPDATE SUBCATEGORY DEBUG ===");
    console.log("1. Update ID:", req.params.id);
    console.log("2. Request body:", req.body);
    console.log("3. Request file:", req.file);
    
    // IMPORTANT: req.body already parsed by multer, no need to parse again
    const { name, description, category_id, subCategoryvariety } = req.body;
    
    console.log("4. Extracted fields:", {
      name,
      description,
      category_id,
      subCategoryvariety
    });

    // Validate required fields
    if (!name || !category_id || !subCategoryvariety) {
      console.log("5. Validation failed - missing required fields");
      return res.status(400).json({ 
        success: false,
        message: "Missing required fields for update",
        required: ["name", "category_id", "subCategoryvariety"],
        received: { name, category_id, subCategoryvariety }
      });
    }

    // Find existing subcategory
    const existingSubCategory = await SubCategory.findById(req.params.id);
    if (!existingSubCategory) {
      console.log("6. SubCategory not found with ID:", req.params.id);
      return res.status(404).json({ 
        success: false,
        message: "SubCategory not found" 
      });
    }
    
    console.log("7. Existing subcategory:", {
      id: existingSubCategory._id,
      currentImage: existingSubCategory.image,
      name: existingSubCategory.name
    });

    // Prepare update data
    let updateData = {
      name: name,
      description: description || existingSubCategory.description,
      category_id: category_id,
      subCategoryvariety: subCategoryvariety,
      updatedAt: Date.now()
    };
    
    // Handle image update - यहाँ important fix है
    if (req.file) {
      // New image uploaded
      console.log("8. New image file received:", {
        path: req.file.path,
        filename: req.file.filename,
        size: req.file.size
      });
      
      // Delete old image file if it exists (optional)
      if (existingSubCategory.image) {
        const oldImagePath = path.join(__dirname, '..', existingSubCategory.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          console.log("   Old image deleted:", oldImagePath);
        }
      }
      
      updateData.image = req.file.path;
      console.log("   Setting new image path:", updateData.image);
    } else {
      // No new image, keep existing one
      console.log("9. No new image, keeping existing image:", existingSubCategory.image);
      updateData.image = existingSubCategory.image;
    }

    console.log("10. Final update data:", updateData);

    // Update in database
    const updatedSubCategory = await SubCategory.findByIdAndUpdate(
      req.params.id,
      updateData,
      { 
        new: true,  // Return updated document
        runValidators: true  // Run model validators
      }
    ).populate('category_id');

    if (!updatedSubCategory) {
      console.log("11. Update failed - subcategory not found after update");
      return res.status(404).json({ 
        success: false,
        message: "SubCategory not found" 
      });
    }

    console.log("12. ✅ Update successful:", {
      id: updatedSubCategory._id,
      name: updatedSubCategory.name,
      image: updatedSubCategory.image
    });

    res.status(200).json({
      success: true,
      message: "SubCategory updated successfully",
      data: updatedSubCategory
    });
    
  } catch (error) {
    console.error("❌ UPDATE ERROR:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    
    res.status(400).json({ 
      success: false,
      message: error.message,
      errors: error.errors 
    });
  }
};
// Get all subcategories
exports.getAllSubCategories = async (req, res) => {
  try {
    console.log('\n🔵 [BACKEND] 📋 GET ALL SUBCATEGORIES');
    
    const subCategories = await SubCategory.find({ deleted_at: null })
      .populate("category_id");
    
    console.log(`✅ Found ${subCategories.length} subcategories`);
    
    // IMPORTANT: Directly return the array, not wrapped in { data }
    res.status(200).json(subCategories);
    
  } catch (error) {
    console.log('🔴 [BACKEND] ❌ Error:', error);
    res.status(500).json({ 
      message: error.message 
    });
  }
};

// Get single subcategory
exports.getSubCategoryById = async (req, res) => {
  try {
    console.log(`\n🔵 [BACKEND] 🔍 GET SUBCATEGORY: ${req.params.id}`);
    
    const subCategory = await SubCategory.findOne({
      _id: req.params.id,
      deleted_at: null,
    }).populate("category_id");

    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "SubCategory not found"
      });
    }

    res.status(200).json({
      success: true,
      data: subCategory
    });
    
  } catch (error) {
    console.log('🔴 [BACKEND] ❌ Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update subcategory


// Delete subcategory
exports.deleteSubCategory = async (req, res) => {
  try {
    console.log(`\n🔵 [BACKEND] 🗑️ DELETE SUBCATEGORY: ${req.params.id}`);
    
    const deletedSubCategory = await SubCategory.findByIdAndUpdate(
      req.params.id,
      { deleted_at: new Date() },
      { new: true }
    );

    if (!deletedSubCategory) {
      return res.status(404).json({
        success: false,
        message: "SubCategory not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "SubCategory deleted successfully"
    });
    
  } catch (error) {
    console.log('🔴 [BACKEND] ❌ Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
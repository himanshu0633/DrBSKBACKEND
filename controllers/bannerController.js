const Banner = require("../models/banner");

// Create Banner (with image upload support)
exports.createBanner = async (req, res) => {
  try {
    let imagePath = '';

    if (req.file) {
      imagePath = req.file.path;
    }

    const banner = new Banner({
      ...req.body,
      slider_image: [imagePath], // still save as array to match schema
    });

    // console.log(banner);
    const savedBanner = await banner.save();
    res.status(201).json(savedBanner);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


// Get All Banners (excluding soft-deleted)
exports.getBanners = async (req, res) => {
  try {
    const banners = await Banner.find({ deleted_at: null });
    res.status(200).json(banners);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get Single Banner by ID
exports.getBannerById = async (req, res) => {
  try {
    const banner = await Banner.findOne({ _id: req.params.id, deleted_at: null });
    if (!banner) return res.status(404).json({ message: "Banner not found" });
    res.status(200).json(banner);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Banner
exports.updateBanner = async (req, res) => {
  try {
    const updatedBanner = await Banner.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedBanner) return res.status(404).json({ message: "Banner not found" });
    res.status(200).json(updatedBanner);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Soft Delete Banner
exports.deleteBanner = async (req, res) => {
  try {
    const deletedBanner = await Banner.findByIdAndUpdate(
      req.params.id,
      { deleted_at: new Date() },
      { new: true }
    );
    if (!deletedBanner) return res.status(404).json({ message: "Banner not found" });
    res.status(200).json({ message: "Banner soft-deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

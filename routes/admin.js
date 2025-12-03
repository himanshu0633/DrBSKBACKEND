const express = require("express");
const {
  adminLogin,
  updateAdmin,
  readAdmin,
  deleteAdmin,
  readAllAdmins,
  createAdmin,
  getAdminCount,
} = require("../controllers/adminControllers");

const tokenRequired = require("../middlewares/authMiddlewares");

const router = express.Router();

router.post("/login", adminLogin);
// router.post("/forgotPassword", forgotPassword);
// router.post("/verifyOTP", verifyOTP);
// router.post("/updatePassword", updatePassword);

router.post("/createAdmin", createAdmin);
router.get("/readallAdmins", readAllAdmins);
router.put("/updateAdmin/:id", updateAdmin);
router.get("/readAdmin/:id", readAdmin);
router.delete("/deleteAdmin/:id", deleteAdmin);
router.get("/count", getAdminCount);


module.exports = router;

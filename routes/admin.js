const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminControllers');

// OTP based routes
router.post('/send-otp', adminController.sendOtp);
router.post('/login-with-otp', adminController.loginWithOtp);

// Old password based routes (optional - remove if not needed)
router.post('/login', adminController.adminLogin);

// Other routes
router.post('/create', adminController.createAdmin);
router.put('/update/:id', adminController.updateAdmin);
router.get('/read/:id', adminController.readAdmin);
router.delete('/delete/:id', adminController.deleteAdmin);
router.get('/read-all', adminController.readAllAdmins);
router.get('/image/:filename', adminController.getImage);
router.get('/count', adminController.getAdminCount);

module.exports = router;
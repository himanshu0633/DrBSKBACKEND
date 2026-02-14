const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const couponController = require('../controllers/couponController');
const tokenRequired = require('../middlewares/authMiddlewares');

// Safe destructuring (avoid undefined crash)



/* ===============================
   Validation Rules
================================= */

const couponValidationRules = [
  body('code')
    .trim()
    .notEmpty().withMessage('Coupon code is required')
    .isLength({ min: 3, max: 20 }).withMessage('Coupon code must be between 3-20 characters')
    .matches(/^[A-Za-z0-9]+$/).withMessage('Coupon code can only contain letters and numbers'),

  body('type')
    .isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),

  body('value')
    .isFloat({ min: 0 }).withMessage('Discount value must be a positive number')
    .custom((value, { req }) => {
      if (req.body.type === 'percentage' && value > 100) {
        throw new Error('Percentage discount cannot exceed 100%');
      }
      return true;
    }),

  body('minPurchase')
    .optional()
    .isFloat({ min: 0 }).withMessage('Minimum purchase must be a positive number'),

  body('maxDiscount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Maximum discount must be a positive number')
    .custom((value, { req }) => {
      if (req.body.type === 'fixed' && value) {
        throw new Error('Maximum discount is only applicable for percentage discounts');
      }
      return true;
    }),

  body('validFrom')
    .isISO8601().withMessage('Valid from date is required'),

  body('validTo')
    .isISO8601().withMessage('Valid to date is required')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.validFrom)) {
        throw new Error('Valid to date must be after valid from date');
      }
      return true;
    }),

  body('usageLimit')
    .optional()
    .isInt({ min: 1 }).withMessage('Usage limit must be a positive integer'),

  body('applicableProducts')
    .optional()
    .isIn(['all', 'specific'])
    .withMessage('Invalid applicable products value'),

  body('selectedProducts')
    .optional()
    .isArray().withMessage('Selected products must be an array')
];

// Validation result middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

/* ===============================
   Public Routes
================================= */

// Validate coupon (for frontend)
router.post('/validate', couponController.validateCoupon);

/* ===============================
   Protected Admin Routes
================================= */

router.use(tokenRequired);

/* ===============================
   CRUD Routes
================================= */

router.route('/')
  .get(couponController.getAllCoupons)
  .post(couponValidationRules, validate, couponController.createCoupon);

router.route('/:id')    
  .get(couponController.getCouponById)
  .put(couponValidationRules, validate, couponController.updateCoupon)
  .delete(couponController.deleteCoupon);

router.patch('/:id/toggle-status', couponController.toggleCouponStatus);
router.post('/:id/use', couponController.incrementUsageCount);

module.exports = router;

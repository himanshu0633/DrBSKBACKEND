const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // userId can be ObjectId for registered users OR string for guest users
  userId: {
    type: mongoose.Schema.Types.Mixed, // Changed from ObjectId to Mixed
    required: true
  },
  userEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true

  },
  userName: {
    type: String,
    required: true,
    trim: true
  },
  email: { // Add email field for better tracking
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Product'
      },
      name: {
        type: String,
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      price: {
        type: Number,
        required: true,
        min: 0
      },
      // Add media field to store product images
      media: [{
        url: String,
        type: {
          type: String,
          enum: ['image', 'video']
        }
      }],
      category: String,
      description: String
    }
  ],
  address: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },

  // Guest user flag
  isGuest: {
    type: Boolean,
    default: false
  },

  // Razorpay integration
  razorpayOrderId: {
    type: String,
    unique: true,
    sparse: true
  },

  // Payment information
  paymentInfo: {
    paymentId: { type: String, default: null },
    amount: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'created', 'authorized', 'captured', 'failed', 'refunded'],
      default: 'created' // Changed from 'pending' to 'created'
    },
    method: { type: String, default: null },
    capturedAt: { type: Date },
    failedAt: { type: Date },
    updatedAt: { type: Date, default: Date.now }
  },

  // Refund information
  refundInfo: {
    refundId: { type: String, default: null },
    amount: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: ['none', 'initiated', 'processed', 'failed'],
      default: 'none'
    },
    reason: { type: String, trim: true },
    initiatedAt: { type: Date },
    processedAt: { type: Date },
    failedAt: { type: Date },
    estimatedSettlement: { type: Date },
    speed: {
      type: String,
      enum: ['normal', 'optimum'],
      default: 'optimum'
    }
  },

  // Order status
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'],
    default: 'Pending'
  },

  // Cancellation details
  cancelReason: { type: String, trim: true },
  cancelledBy: {
    type: String,
    enum: ['admin', 'user', 'system']
  },
  cancelledAt: { type: Date },

  // Delivery tracking
  trackingNumber: { type: String, default: null },
  courierName: { type: String, default: null },
  expectedDelivery: { type: Date },
  deliveredAt: { type: Date },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ razorpayOrderId: 1 });
orderSchema.index({ 'paymentInfo.paymentId': 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ userEmail: 1 });
orderSchema.index({ email: 1 });
orderSchema.index({ isGuest: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'paymentInfo.status': 1 });

// Virtual for payment status display
orderSchema.virtual('paymentStatusDisplay').get(function () {
  const status = this.paymentInfo?.status || 'created';
  switch (status) {
    case 'captured': return 'Paid';
    case 'authorized': return 'Authorized (Pending Capture)';
    case 'failed': return 'Payment Failed';
    case 'pending': return 'Payment Pending';
    case 'created': return 'Payment Initiated';
    default: return status.charAt(0).toUpperCase() + status.slice(1);
  }
});

// Virtual for refund status display
orderSchema.virtual('refundStatusDisplay').get(function () {
  const status = this.refundInfo?.status || 'none';
  switch (status) {
    case 'none': return 'No Refund';
    case 'initiated': return 'Refund Initiated';
    case 'processed': return 'Refund Processed';
    case 'failed': return 'Refund Failed';
    default: return status.charAt(0).toUpperCase() + status.slice(1);
  }
});

// Virtual for estimated settlement display
orderSchema.virtual('estimatedSettlementDisplay').get(function () {
  if (!this.refundInfo?.estimatedSettlement) return null;

  const now = new Date();
  const settlement = new Date(this.refundInfo.estimatedSettlement);
  const diffTime = settlement - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Should be settled by now';
  if (diffDays === 1) return 'Expected by tomorrow';
  return `Expected in ${diffDays} days`;
});

// Virtual to check if user is guest
orderSchema.virtual('isGuestUser').get(function () {
  return this.isGuest || (typeof this.userId === 'string' && this.userId.startsWith('guest_'));
});

// Virtual to get user type
orderSchema.virtual('userType').get(function () {
  if (this.isGuest || (typeof this.userId === 'string' && this.userId.startsWith('guest_'))) {
    return 'Guest';
  }
  return 'Registered';
});

// Pre-save validation and status management
orderSchema.pre('save', function (next) {
  // Auto-detect guest user
  if (typeof this.userId === 'string' && this.userId.startsWith('guest_')) {
    this.isGuest = true;
  }

  // Validate total amount matches items
  const calculatedTotal = this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);

  if (Math.abs(this.totalAmount - calculatedTotal) > 0.01) {
    return next(new Error(`Total amount mismatch: expected ${calculatedTotal}, got ${this.totalAmount}`));
  }

  // Handle status changes
  if (this.isModified('status')) {
    const now = new Date();
    
    if (this.status === 'Cancelled' && !this.cancelledAt) {
      this.cancelledAt = now;
      if (!this.cancelledBy) this.cancelledBy = 'user';
    }
    
    if (this.status === 'Delivered' && !this.deliveredAt) {
      this.deliveredAt = now;
    }
  }

  // Update payment timestamps
  if (this.isModified('paymentInfo.status')) {
    const now = new Date();
    const paymentStatus = this.paymentInfo.status;
    
    if (paymentStatus === 'captured' && !this.paymentInfo.capturedAt) {
      this.paymentInfo.capturedAt = now;
      // Auto update order status to Confirmed when payment is captured
      if (this.status === 'Pending') {
        this.status = 'Confirmed';
      }
    } else if (paymentStatus === 'failed' && !this.paymentInfo.failedAt) {
      this.paymentInfo.failedAt = now;
    }
    this.paymentInfo.updatedAt = now;
  }

  // Update refund timestamps
  if (this.isModified('refundInfo.status')) {
    const now = new Date();
    const refundStatus = this.refundInfo.status;
    
    if (refundStatus === 'initiated' && !this.refundInfo.initiatedAt) {
      this.refundInfo.initiatedAt = now;
    } else if (refundStatus === 'processed' && !this.refundInfo.processedAt) {
      this.refundInfo.processedAt = now;
    } else if (refundStatus === 'failed' && !this.refundInfo.failedAt) {
      this.refundInfo.failedAt = now;
    }
  }

  next();
});

// Pre-validate to ensure either ObjectId or guest string
orderSchema.pre('validate', function (next) {
  // Check if userId is valid
  if (!this.userId) {
    return next(new Error('userId is required'));
  }

  // Check if it's a valid ObjectId or guest string
  if (typeof this.userId === 'string') {
    if (this.userId.startsWith('guest_')) {
      // Valid guest ID
      next();
    } else if (mongoose.Types.ObjectId.isValid(this.userId)) {
      // Valid ObjectId string
      this.userId = new mongoose.Types.ObjectId(this.userId);
      next();
    } else {
      return next(new Error('Invalid userId format'));
    }
  } else if (this.userId instanceof mongoose.Types.ObjectId) {
    // Valid ObjectId
    next();
  } else {
    return next(new Error('userId must be either ObjectId or guest string'));
  }
});

// Static methods
orderSchema.statics.findPaymentIssues = function () {
  return this.find({
    $or: [
      { 'paymentInfo.status': 'failed' },
      { 'paymentInfo.status': 'authorized', createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
    ]
  });
};

orderSchema.statics.findPendingRefunds = function () {
  return this.find({
    status: 'Cancelled',
    'paymentInfo.status': 'captured',
    'refundInfo.status': { $in: ['none', 'initiated'] }
  });
};

orderSchema.statics.findGuestOrders = function () {
  return this.find({
    $or: [
      { isGuest: true },
      { userId: /^guest_/ }
    ]
  });
};

orderSchema.statics.findByEmail = function (email) {
  return this.find({
    $or: [
      { email: email },
      { userEmail: email }
    ]
  }).sort({ createdAt: -1 });
};

// Instance method to check if user can modify order
orderSchema.methods.canModify = function (userId) {
  if (this.isGuest) {
    return this.userId === userId;
  }
  return this.userId.toString() === userId.toString();
};

// Instance method to get order summary
orderSchema.methods.getSummary = function () {
  return {
    orderId: this._id,
    totalAmount: this.totalAmount,
    status: this.status,
    paymentStatus: this.paymentInfo.status,
    itemsCount: this.items.length,
    createdAt: this.createdAt,
    userType: this.userType,
    email: this.email
  };
};

module.exports = mongoose.model('Order', orderSchema);
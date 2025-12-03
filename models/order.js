// // // models/Order.js
// // const mongoose = require('mongoose');

// // const orderSchema = new mongoose.Schema({
// //   userId: {
// //     type: mongoose.Schema.Types.ObjectId,
// //     required: true,
// //     ref: 'User',
// //   },
// //   items: [
// //     {
// //       productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
// //       name: String,
// //       quantity: { type: Number, default: 1 },
// //       price: Number,
// //     }
// //   ],
// //   address: { type: String, required: true },
// //   phone: { type: String, required: true },
// //   totalAmount: { type: Number, required: true },
// //   status: { type: String, default: 'Pending' },
// //   paymentId: String,
// //   createdAt: { type: Date, default: Date.now }
// // });

// // module.exports = mongoose.model('Order', orderSchema);


// const mongoose = require('mongoose');

// const orderSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     required: true,
//     ref: 'User',
//   },
//   items: [
//     {
//       productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
//       name: String,
//       quantity: { type: Number, default: 1 },
//       price: Number,
//     }
//   ],
//   address: { type: String, required: true },
//   phone: { type: String, required: true },
//   totalAmount: { type: Number, required: true },

//   // Add these fields for Razorpay integration
//   razorpayOrderId: { type: String }, // To store Razorpay order ID linked with this order
//   paymentInfo: {
//     paymentId: { type: String },
//     amount: { type: Number },
//     status: { type: String }, // e.g., 'captured', 'failed', 'refunded'
//     updatedAt: { type: Date }
//   },

//   status: { type: String, default: 'Pending' }, 

//   createdAt: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model('Order', orderSchema);


// // 3:
// const mongoose = require('mongoose');

// const orderSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     required: true,
//     ref: 'Admin', // Changed to Admin since that's your user model
//   },
//   userEmail: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   userName: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   items: [
//     {
//       productId: {
//         type: mongoose.Schema.Types.ObjectId,
//         required: true,
//         ref: 'Product'
//       },
//       name: {
//         type: String,
//         required: true
//       },
//       quantity: {
//         type: Number,
//         required: true,
//         min: 1
//       },
//       price: {
//         type: Number,
//         required: true,
//         min: 0
//       }
//     }
//   ],
//   address: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   phone: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   totalAmount: {
//     type: Number,
//     required: true,
//     min: 0
//   },

//   // Razorpay integration
//   razorpayOrderId: {
//     type: String,
//     unique: true,
//     sparse: true
//   },

//   // Payment information
//   paymentInfo: {
//     paymentId: { type: String, default: null },
//     amount: { type: Number, min: 0 },
//     status: {
//       type: String,
//       enum: ['pending', 'created', 'authorized', 'captured', 'failed', 'refunded'],
//       default: 'pending'
//     },
//     method: { type: String, default: null },
//     capturedAt: { type: Date },
//     failedAt: { type: Date },
//     updatedAt: { type: Date, default: Date.now }
//   },

//   // Refund information
//   refundInfo: {
//     refundId: { type: String, default: null },
//     amount: { type: Number, min: 0, default: 0 },
//     status: {
//       type: String,
//       enum: ['none', 'initiated', 'processed', 'failed'],
//       default: 'none'
//     },
//     reason: { type: String, trim: true },
//     initiatedAt: { type: Date },
//     processedAt: { type: Date },
//     failedAt: { type: Date },
//     estimatedSettlement: { type: Date },
//     speed: {
//       type: String,
//       enum: ['normal', 'optimum'],
//       default: 'optimum'
//     }
//   },

//   // Order status
//   status: {
//     type: String,
//     enum: ['Pending', 'Delivered', 'Cancelled', 'Refunded'],
//     default: 'Pending'
//   },

//   // Cancellation details
//   cancelReason: { type: String, trim: true },
//   cancelledBy: {
//     type: String,
//     enum: ['admin', 'user', 'system']
//   },
//   cancelledAt: { type: Date },

// }, {
//   timestamps: true,
//   toJSON: { virtuals: true },
//   toObject: { virtuals: true }
// });

// // Indexes for performance
// orderSchema.index({ userId: 1, createdAt: -1 });
// orderSchema.index({ razorpayOrderId: 1 });
// orderSchema.index({ 'paymentInfo.paymentId': 1 });
// orderSchema.index({ status: 1 });
// orderSchema.index({ userEmail: 1 });

// // Virtual for payment status display
// orderSchema.virtual('paymentStatusDisplay').get(function () {
//   const status = this.paymentInfo?.status || 'pending';
//   switch (status) {
//     case 'captured': return 'Paid';
//     case 'authorized': return 'Authorized (Pending Capture)';
//     case 'failed': return 'Payment Failed';
//     case 'pending': return 'Payment Pending';
//     case 'created': return 'Payment Initiated';
//     default: return status.charAt(0).toUpperCase() + status.slice(1);
//   }
// });

// // Virtual for refund status display
// orderSchema.virtual('refundStatusDisplay').get(function () {
//   const status = this.refundInfo?.status || 'none';
//   switch (status) {
//     case 'none': return 'No Refund';
//     case 'initiated': return 'Refund Initiated';
//     case 'processed': return 'Refund Processed';
//     case 'failed': return 'Refund Failed';
//     default: return status.charAt(0).toUpperCase() + status.slice(1);
//   }
// });

// // Virtual for estimated settlement display
// orderSchema.virtual('estimatedSettlementDisplay').get(function () {
//   if (!this.refundInfo?.estimatedSettlement) return null;

//   const now = new Date();
//   const settlement = new Date(this.refundInfo.estimatedSettlement);
//   const diffTime = settlement - now;
//   const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

//   if (diffDays <= 0) return 'Should be settled by now';
//   if (diffDays === 1) return 'Expected by tomorrow';
//   return `Expected in ${diffDays} days`;
// });

// // Pre-save validation
// orderSchema.pre('save', function (next) {
//   // Validate total amount matches items
//   const calculatedTotal = this.items.reduce((total, item) => {
//     return total + (item.price * item.quantity);
//   }, 0);

//   if (Math.abs(this.totalAmount - calculatedTotal) > 0.01) {
//     return next(new Error(`Total amount mismatch: expected ${calculatedTotal}, got ${this.totalAmount}`));
//   }

//   // Handle status changes
//   if (this.isModified('status')) {
//     if (this.status === 'Cancelled' && !this.cancelledAt) {
//       this.cancelledAt = new Date();
//       if (!this.cancelledBy) this.cancelledBy = 'system';
//     }
//   }

//   // Update payment timestamps
//   if (this.isModified('paymentInfo.status')) {
//     const now = new Date();
//     if (this.paymentInfo.status === 'captured' && !this.paymentInfo.capturedAt) {
//       this.paymentInfo.capturedAt = now;
//     } else if (this.paymentInfo.status === 'failed' && !this.paymentInfo.failedAt) {
//       this.paymentInfo.failedAt = now;
//     }
//     this.paymentInfo.updatedAt = now;
//   }

//   // Update refund timestamps
//   if (this.isModified('refundInfo.status')) {
//     const now = new Date();
//     if (this.refundInfo.status === 'initiated' && !this.refundInfo.initiatedAt) {
//       this.refundInfo.initiatedAt = now;
//     } else if (this.refundInfo.status === 'processed' && !this.refundInfo.processedAt) {
//       this.refundInfo.processedAt = now;
//     } else if (this.refundInfo.status === 'failed' && !this.refundInfo.failedAt) {
//       this.refundInfo.failedAt = now;
//     }
//   }

//   next();
// });

// // Static methods for admin queries
// orderSchema.statics.findPaymentIssues = function () {
//   return this.find({
//     $or: [
//       { 'paymentInfo.status': 'failed' },
//       { 'paymentInfo.status': 'authorized', createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
//     ]
//   });
// };

// orderSchema.statics.findPendingRefunds = function () {
//   return this.find({
//     status: 'Cancelled',
//     'paymentInfo.status': 'captured',
//     'refundInfo.status': { $in: ['none', 'initiated'] }
//   });
// };

// module.exports = mongoose.model('Order', orderSchema);



// // final:
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Admin', // Changed to Admin since that's your user model
  },
  userEmail: {
    type: String,
    required: true,
    trim: true
  },
  userName: {
    type: String,
    required: true,
    trim: true
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
      }
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
      default: 'pending'
    },
    method: { type: String, default: null },
    capturedAt: { type: Date },
    failedAt: { type: Date },
    updatedAt: { type: Date, default: Date.now }
  },

  // Refund information - FIXED: No default refund status
  refundInfo: {
    refundId: { type: String, default: null },
    amount: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: ['none', 'initiated', 'processed', 'failed'],
      default: 'none'  // CHANGED: Default to 'none' instead of created
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
    },
    notes: { type: String, default: null }
  },

  // Order status
  status: {
    type: String,
    enum: ['Pending', 'Delivered', 'Cancelled', 'Refunded'],
    default: 'Pending'
  },

  // Cancellation details
  cancelReason: { type: String, trim: true },
  cancelledBy: {
    type: String,
    enum: ['admin', 'user', 'system']
  },
  cancelledAt: { type: Date },

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

// Virtual for payment status display
orderSchema.virtual('paymentStatusDisplay').get(function () {
  const status = this.paymentInfo?.status || 'pending';
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

// Pre-save validation and status management
orderSchema.pre('save', function (next) {
  // Validate total amount matches items
  const calculatedTotal = this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);

  if (Math.abs(this.totalAmount - calculatedTotal) > 0.01) {
    return next(new Error(`Total amount mismatch: expected ${calculatedTotal}, got ${this.totalAmount}`));
  }

  // Handle status changes
  if (this.isModified('status')) {
    if (this.status === 'Cancelled' && !this.cancelledAt) {
      this.cancelledAt = new Date();
      if (!this.cancelledBy) this.cancelledBy = 'system';
    }
  }

  // Update payment timestamps
  if (this.isModified('paymentInfo.status')) {
    const now = new Date();
    if (this.paymentInfo.status === 'captured' && !this.paymentInfo.capturedAt) {
      this.paymentInfo.capturedAt = now;
    } else if (this.paymentInfo.status === 'failed' && !this.paymentInfo.failedAt) {
      this.paymentInfo.failedAt = now;
    }
    this.paymentInfo.updatedAt = now;
  }

  // Update refund timestamps
  if (this.isModified('refundInfo.status')) {
    const now = new Date();
    if (this.refundInfo.status === 'initiated' && !this.refundInfo.initiatedAt) {
      this.refundInfo.initiatedAt = now;
    } else if (this.refundInfo.status === 'processed' && !this.refundInfo.processedAt) {
      this.refundInfo.processedAt = now;
    } else if (this.refundInfo.status === 'failed' && !this.refundInfo.failedAt) {
      this.refundInfo.failedAt = now;
    }
  }

  next();
});

// Static methods for admin queries
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

module.exports = mongoose.model('Order', orderSchema);

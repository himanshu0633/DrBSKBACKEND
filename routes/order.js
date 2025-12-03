// // // 4:
// // const express = require('express');
// // const router = express.Router();
// // const Order = require('../models/order');
// // const Admin = require('../models/admin'); // Your user model
// // const { logger } = require("../utils/logger");
// // const Razorpay = require('razorpay');

// // // Initialize Razorpay instance
// // const razorpayInstance = new Razorpay({
// //     key_id: process.env.RAZORPAY_KEY_ID,
// //     key_secret: process.env.RAZORPAY_KEY_SECRET,
// // });

// // // Create Order Route - Complete with email integration
// // router.post('/createOrder', async (req, res) => {
// //     const { userId, items, address, phone, totalAmount } = req.body;

// //     console.log("=== CREATE ORDER REQUEST ===");
// //     console.log("Request body:", {
// //         userId: !!userId,
// //         items: items?.length,
// //         address: !!address,
// //         phone: !!phone,
// //         totalAmount
// //     });

// //     // Comprehensive validation
// //     if (!userId) {
// //         return res.status(400).json({
// //             success: false,
// //             message: "User ID is required"
// //         });
// //     }

// //     if (!items || !Array.isArray(items) || items.length === 0) {
// //         return res.status(400).json({
// //             success: false,
// //             message: "Items are required and must be a non-empty array"
// //         });
// //     }

// //     if (!address?.trim()) {
// //         return res.status(400).json({
// //             success: false,
// //             message: "Address is required"
// //         });
// //     }

// //     if (!phone?.trim()) {
// //         return res.status(400).json({
// //             success: false,
// //             message: "Phone number is required"
// //         });
// //     }

// //     if (!totalAmount || totalAmount <= 0) {
// //         return res.status(400).json({
// //             success: false,
// //             message: "Valid total amount is required"
// //         });
// //     }

// //     try {
// //         // Fetch user details for email
// //         const user = await Admin.findById(userId);
// //         if (!user) {
// //             return res.status(404).json({
// //                 success: false,
// //                 message: "User not found"
// //             });
// //         }

// //         console.log("✅ User found:", user.email);

// //         // Validate items structure
// //         for (let i = 0; i < items.length; i++) {
// //             const item = items[i];
// //             if (!item.productId || !item.name || !item.quantity || item.quantity < 1 || !item.price || item.price < 0) {
// //                 return res.status(400).json({
// //                     success: false,
// //                     message: `Invalid item at index ${i}. Each item needs productId, name, quantity (≥1), and price (≥0)`
// //                 });
// //             }
// //         }

// //         // Calculate and validate total
// //         const calculatedTotal = items.reduce((total, item) => {
// //             return total + (item.price * item.quantity);
// //         }, 0);

// //         if (Math.abs(totalAmount - calculatedTotal) > 0.01) {
// //             return res.status(400).json({
// //                 success: false,
// //                 message: `Total amount mismatch. Expected: ${calculatedTotal}, Received: ${totalAmount}`
// //             });
// //         }

// //         // Create Razorpay Order with customer details including email
// //         const razorpayOrder = await razorpayInstance.orders.create({
// //             amount: Math.round(totalAmount * 100), // Convert to paise
// //             currency: "INR",
// //             receipt: `receipt_${Date.now()}_${userId}`,
// //             payment_capture: 1,
// //             notes: {
// //                 userId: userId,
// //                 userEmail: user.email,
// //                 userName: user.name,
// //                 phone: phone,
// //                 address: address
// //             },
// //             // Include customer information for dashboard
// //             customer_details: {
// //                 name: user.name || 'Customer',
// //                 email: user.email,
// //                 contact: phone
// //             }
// //         });

// //         console.log("✅ Razorpay order created:", razorpayOrder.id);

// //         // Create order in database with user email
// //         const newOrder = new Order({
// //             userId,
// //             userEmail: user.email,
// //             userName: user.name,
// //             items: items.map(item => ({
// //                 productId: item.productId,
// //                 name: item.name.trim(),
// //                 quantity: parseInt(item.quantity),
// //                 price: parseFloat(item.price)
// //             })),
// //             address: address.trim(),
// //             phone: phone.trim(),
// //             totalAmount: parseFloat(totalAmount),
// //             razorpayOrderId: razorpayOrder.id,
// //             paymentInfo: {
// //                 amount: totalAmount,
// //                 status: 'created',
// //                 updatedAt: new Date()
// //             },
// //             status: 'Pending'
// //         });

// //         const savedOrder = await newOrder.save();

// //         console.log("✅ Order saved to database:", savedOrder._id);

// //         logger.info("Order created successfully", {
// //             orderId: savedOrder._id,
// //             razorpayOrderId: razorpayOrder.id,
// //             userId,
// //             userEmail: user.email,
// //             totalAmount
// //         });

// //         res.status(201).json({
// //             success: true,
// //             message: "Order created successfully",
// //             orderId: savedOrder._id,
// //             razorpayOrderId: razorpayOrder.id,
// //             order: {
// //                 _id: savedOrder._id,
// //                 status: savedOrder.status,
// //                 totalAmount: savedOrder.totalAmount,
// //                 createdAt: savedOrder.createdAt,
// //                 userEmail: savedOrder.userEmail,
// //                 userName: savedOrder.userName
// //             }
// //         });

// //     } catch (error) {
// //         console.error("❌ Error creating order:", error);
// //         logger.error("Order creation failed", {
// //             error: error.message,
// //             stack: error.stack,
// //             userId,
// //             totalAmount
// //         });

// //         // Handle specific MongoDB validation errors
// //         if (error.name === 'ValidationError') {
// //             const validationErrors = Object.values(error.errors).map(e => e.message);
// //             return res.status(400).json({
// //                 success: false,
// //                 message: "Validation failed: " + validationErrors.join(', ')
// //             });
// //         }

// //         // Handle duplicate key errors
// //         if (error.code === 11000) {
// //             return res.status(400).json({
// //                 success: false,
// //                 message: "Duplicate order detected. Please try again."
// //             });
// //         }

// //         res.status(500).json({
// //             success: false,
// //             message: "Internal server error while creating order",
// //             error: error.message
// //         });
// //     }
// // });

// // // Get Orders by User ID with complete information
// // router.get('/orders/:userId', async (req, res) => {
// //     const { userId } = req.params;

// //     console.log("=== GET USER ORDERS ===");
// //     console.log("User ID:", userId);

// //     try {
// //         const orders = await Order.find({ userId })
// //             .sort({ createdAt: -1 })
// //             .populate('items.productId', 'name media')
// //             .lean();

// //         console.log("✅ Found orders:", orders.length);

// //         // Fetch live payment status for each order
// //         const ordersWithLiveStatus = await Promise.all(
// //             orders.map(async (order) => {
// //                 if (order.razorpayOrderId) {
// //                     try {
// //                         const payments = await razorpayInstance.orders.fetchPayments(order.razorpayOrderId);
// //                         const latestPayment = payments.items.length ? payments.items[0] : null;

// //                         if (latestPayment && latestPayment.id !== order.paymentInfo?.paymentId) {
// //                             // Update payment info with latest data
// //                             await Order.findByIdAndUpdate(order._id, {
// //                                 'paymentInfo.paymentId': latestPayment.id,
// //                                 'paymentInfo.status': latestPayment.status,
// //                                 'paymentInfo.method': latestPayment.method,
// //                                 'paymentInfo.updatedAt': new Date()
// //                             });

// //                             order.paymentInfo = {
// //                                 ...order.paymentInfo,
// //                                 paymentId: latestPayment.id,
// //                                 status: latestPayment.status,
// //                                 method: latestPayment.method,
// //                                 updatedAt: new Date()
// //                             };
// //                         }

// //                         // Check for refunds if order is cancelled
// //                         if (order.status === 'Cancelled' && latestPayment && latestPayment.status === 'captured') {
// //                             try {
// //                                 const refunds = await razorpayInstance.payments.fetchMultipleRefund(latestPayment.id);
// //                                 if (refunds.items.length > 0) {
// //                                     const latestRefund = refunds.items[0];
// //                                     if (latestRefund.id !== order.refundInfo?.refundId) {
// //                                         // Update refund info
// //                                         const estimatedSettlement = new Date(latestRefund.created_at * 1000);
// //                                         estimatedSettlement.setDate(estimatedSettlement.getDate() + (latestRefund.speed_processed === 'optimum' ? 5 : 7));

// //                                         await Order.findByIdAndUpdate(order._id, {
// //                                             'refundInfo.refundId': latestRefund.id,
// //                                             'refundInfo.amount': latestRefund.amount / 100,
// //                                             'refundInfo.status': latestRefund.status === 'processed' ? 'processed' : 'initiated',
// //                                             'refundInfo.processedAt': latestRefund.processed_at ? new Date(latestRefund.processed_at * 1000) : null,
// //                                             'refundInfo.estimatedSettlement': estimatedSettlement,
// //                                             'refundInfo.speed': latestRefund.speed_processed || 'optimum'
// //                                         });

// //                                         order.refundInfo = {
// //                                             ...order.refundInfo,
// //                                             refundId: latestRefund.id,
// //                                             amount: latestRefund.amount / 100,
// //                                             status: latestRefund.status === 'processed' ? 'processed' : 'initiated',
// //                                             processedAt: latestRefund.processed_at ? new Date(latestRefund.processed_at * 1000) : null,
// //                                             estimatedSettlement: estimatedSettlement,
// //                                             speed: latestRefund.speed_processed || 'optimum'
// //                                         };
// //                                     }
// //                                 }
// //                             } catch (refundError) {
// //                                 console.log('No refunds found for payment:', latestPayment.id);
// //                             }
// //                         }
// //                     } catch (paymentError) {
// //                         console.log('Error fetching payment for order:', order._id, paymentError.message);
// //                     }
// //                 }
// //                 return order;
// //             })
// //         );

// //         logger.info("User orders fetched successfully", { userId, count: orders.length });

// //         res.status(200).json({
// //             success: true,
// //             orders: ordersWithLiveStatus,
// //             totalCount: orders.length
// //         });

// //     } catch (error) {
// //         console.error("❌ Error fetching user orders:", error);
// //         logger.error("Error fetching user orders", { error: error.message, userId });

// //         res.status(500).json({
// //             success: false,
// //             message: "Failed to fetch orders",
// //             error: error.message
// //         });
// //     }
// // });

// // // Get All Orders (Admin) with complete information
// // router.get('/orders', async (req, res) => {
// //     console.log("=== GET ALL ORDERS (ADMIN) ===");

// //     try {
// //         const orders = await Order.find()
// //             .sort({ createdAt: -1 })
// //             .populate('userId', 'name email phone')
// //             .populate('items.productId', 'name media')
// //             .lean();

// //         console.log("✅ Found all orders:", orders.length);

// //         logger.info("All orders fetched successfully", { count: orders.length });

// //         res.status(200).json({
// //             success: true,
// //             orders: orders,
// //             totalCount: orders.length
// //         });

// //     } catch (error) {
// //         console.error("❌ Error fetching all orders:", error);
// //         logger.error("Error fetching all orders", { error: error.message });

// //         res.status(500).json({
// //             success: false,
// //             message: "Failed to fetch orders",
// //             error: error.message
// //         });
// //     }
// // });

// // // Update Order Status with Smart Refund Processing - ONLY ADMINS CAN TRIGGER REFUNDS
// // router.put('/orders/:orderId/status', async (req, res) => {
// //     const { orderId } = req.params;
// //     const { status, cancelReason } = req.body;

// //     console.log("=== UPDATE ORDER STATUS ===");
// //     console.log("Order ID:", orderId, "New Status:", status, "Reason:", cancelReason);

// //     if (!['Pending', 'Delivered', 'Cancelled'].includes(status)) {
// //         return res.status(400).json({
// //             success: false,
// //             message: "Invalid status. Must be Pending, Delivered, or Cancelled"
// //         });
// //     }

// //     try {
// //         const order = await Order.findById(orderId);
// //         if (!order) {
// //             return res.status(404).json({
// //                 success: false,
// //                 message: "Order not found"
// //             });
// //         }

// //         let refundProcessed = false;

// //         // If admin is cancelling and payment was captured, process automatic refund
// //         if (status === 'Cancelled' && order.status !== 'Cancelled') {
// //             // Check if payment exists and is captured
// //             if (order.paymentInfo?.paymentId && order.paymentInfo?.status === 'captured') {
// //                 console.log("💰 Processing automatic refund for cancelled order");

// //                 try {
// //                     const refund = await razorpayInstance.payments.refund(
// //                         order.paymentInfo.paymentId,
// //                         {
// //                             amount: Math.round(order.totalAmount * 100),
// //                             speed: 'optimum',
// //                             notes: {
// //                                 reason: cancelReason || 'Order cancelled by admin',
// //                                 orderId: order._id.toString()
// //                             },
// //                             receipt: `refund_${order._id}_${Date.now()}`
// //                         }
// //                     );

// //                     console.log("✅ Refund initiated:", refund.id);

// //                     // Calculate estimated settlement date
// //                     const estimatedSettlement = new Date();
// //                     estimatedSettlement.setDate(estimatedSettlement.getDate() + 5); // 5 days for optimum

// //                     // Update order with refund info
// //                     order.refundInfo = {
// //                         refundId: refund.id,
// //                         amount: refund.amount / 100,
// //                         status: 'initiated',
// //                         reason: cancelReason || 'Order cancelled by admin',
// //                         initiatedAt: new Date(),
// //                         estimatedSettlement: estimatedSettlement,
// //                         speed: 'optimum'
// //                     };

// //                     refundProcessed = true;

// //                 } catch (refundError) {
// //                     console.error("❌ Refund failed:", refundError);
// //                     logger.error("Refund processing failed", {
// //                         orderId,
// //                         paymentId: order.paymentInfo.paymentId,
// //                         error: refundError.message
// //                     });

// //                     // Continue with cancellation even if refund fails
// //                     // Admin can manually process refund later
// //                 }
// //             }

// //             // Update cancellation details
// //             order.status = 'Cancelled';
// //             order.cancelReason = cancelReason || 'Cancelled by admin';
// //             order.cancelledBy = 'admin';
// //             order.cancelledAt = new Date();

// //         } else {
// //             // Regular status update
// //             order.status = status;
// //         }

// //         await order.save();

// //         console.log("✅ Order status updated successfully");
// //         logger.info("Order status updated", {
// //             orderId,
// //             newStatus: status,
// //             refundInitiated: !!order.refundInfo?.refundId
// //         });

// //         res.status(200).json({
// //             success: true,
// //             message: "Order status updated successfully",
// //             order: {
// //                 _id: order._id,
// //                 status: order.status,
// //                 paymentInfo: order.paymentInfo,
// //                 refundInfo: order.refundInfo,
// //                 cancelReason: order.cancelReason,
// //                 cancelledAt: order.cancelledAt
// //             },
// //             refundProcessed: refundProcessed
// //         });

// //     } catch (error) {
// //         console.error("❌ Error updating order status:", error);
// //         logger.error("Error updating order status", { orderId, error: error.message });

// //         res.status(500).json({
// //             success: false,
// //             message: "Failed to update order status",
// //             error: error.message
// //         });
// //     }
// // });

// // // Get Payment Status with complete details including Payment ID
// // router.get('/paymentStatus/:orderId', async (req, res) => {
// //     const { orderId } = req.params;

// //     console.log("=== GET PAYMENT STATUS ===");
// //     console.log("Order ID:", orderId);

// //     try {
// //         const order = await Order.findById(orderId);
// //         if (!order) {
// //             return res.status(404).json({
// //                 success: false,
// //                 message: "Order not found"
// //             });
// //         }

// //         let latestPaymentInfo = order.paymentInfo;
// //         let latestRefundInfo = order.refundInfo;
// //         let razorpayPayments = [];
// //         let razorpayRefunds = [];

// //         // Fetch live data from Razorpay
// //         if (order.razorpayOrderId) {
// //             try {
// //                 const payments = await razorpayInstance.orders.fetchPayments(order.razorpayOrderId);
// //                 razorpayPayments = payments.items;

// //                 const latestPayment = payments.items.length ? payments.items[0] : null;
// //                 if (latestPayment) {
// //                     latestPaymentInfo = {
// //                         paymentId: latestPayment.id, // This ensures Payment ID is included
// //                         amount: latestPayment.amount / 100,
// //                         status: latestPayment.status,
// //                         method: latestPayment.method,
// //                         capturedAt: latestPayment.captured_at ? new Date(latestPayment.captured_at * 1000) : null,
// //                         failedAt: latestPayment.failed_at ? new Date(latestPayment.failed_at * 1000) : null,
// //                         updatedAt: new Date()
// //                     };

// //                     // Fetch refunds for this payment
// //                     if (latestPayment.status === 'captured') {
// //                         try {
// //                             const refunds = await razorpayInstance.payments.fetchMultipleRefund(latestPayment.id);
// //                             razorpayRefunds = refunds.items;

// //                             if (refunds.items.length > 0) {
// //                                 const latestRefund = refunds.items[0];
// //                                 const estimatedSettlement = new Date(latestRefund.created_at * 1000);
// //                                 estimatedSettlement.setDate(estimatedSettlement.getDate() + (latestRefund.speed_processed === 'optimum' ? 5 : 7));

// //                                 latestRefundInfo = {
// //                                     refundId: latestRefund.id,
// //                                     amount: latestRefund.amount / 100,
// //                                     status: latestRefund.status === 'processed' ? 'processed' : 'initiated',
// //                                     reason: latestRefund.notes?.reason || 'Refund processed',
// //                                     initiatedAt: new Date(latestRefund.created_at * 1000),
// //                                     processedAt: latestRefund.processed_at ? new Date(latestRefund.processed_at * 1000) : null,
// //                                     estimatedSettlement: estimatedSettlement,
// //                                     speed: latestRefund.speed_processed || 'optimum'
// //                                 };
// //                             }
// //                         } catch (refundError) {
// //                             console.log('No refunds found for payment:', latestPayment.id);
// //                         }
// //                     }

// //                     // Update order with latest info
// //                     await Order.findByIdAndUpdate(orderId, {
// //                         paymentInfo: latestPaymentInfo,
// //                         refundInfo: latestRefundInfo
// //                     });
// //                 }
// //             } catch (razorpayError) {
// //                 console.error("Error fetching from Razorpay:", razorpayError.message);
// //             }
// //         }

// //         res.status(200).json({
// //             success: true,
// //             paymentInfo: latestPaymentInfo,
// //             refundInfo: latestRefundInfo,
// //             razorpayPayments,
// //             razorpayRefunds,
// //             order: {
// //                 _id: order._id,
// //                 status: order.status,
// //                 totalAmount: order.totalAmount,
// //                 createdAt: order.createdAt,
// //                 userEmail: order.userEmail
// //             }
// //         });

// //     } catch (error) {
// //         console.error("❌ Error fetching payment status:", error);
// //         logger.error("Error fetching payment status", { orderId, error: error.message });

// //         res.status(500).json({
// //             success: false,
// //             message: "Failed to fetch payment status",
// //             error: error.message
// //         });
// //     }
// // });

// // // Capture Payment endpoint
// // router.post('/capturePayment/:orderId', async (req, res) => {
// //     const { orderId } = req.params;

// //     console.log("=== CAPTURE PAYMENT ===");
// //     console.log("Order ID:", orderId);

// //     try {
// //         const order = await Order.findById(orderId);
// //         if (!order) {
// //             return res.status(404).json({
// //                 success: false,
// //                 message: "Order not found"
// //             });
// //         }

// //         if (!order.paymentInfo?.paymentId) {
// //             return res.status(400).json({
// //                 success: false,
// //                 message: "No payment found for this order"
// //             });
// //         }

// //         if (order.paymentInfo.status !== 'authorized') {
// //             return res.status(400).json({
// //                 success: false,
// //                 message: "Payment is not in authorized state"
// //             });
// //         }

// //         // Capture the payment
// //         const capturedPayment = await razorpayInstance.payments.capture(
// //             order.paymentInfo.paymentId,
// //             Math.round(order.totalAmount * 100),
// //             'INR'
// //         );

// //         // Update order with captured payment info
// //         order.paymentInfo.status = 'captured';
// //         order.paymentInfo.capturedAt = new Date();
// //         order.paymentInfo.updatedAt = new Date();

// //         await order.save();

// //         console.log("✅ Payment captured successfully");

// //         res.status(200).json({
// //             success: true,
// //             message: "Payment captured successfully",
// //             paymentInfo: order.paymentInfo
// //         });

// //     } catch (error) {
// //         console.error("❌ Error capturing payment:", error);
// //         res.status(500).json({
// //             success: false,
// //             message: "Failed to capture payment",
// //             error: error.message
// //         });
// //     }
// // });

// // // Manual refund endpoint for admins
// // router.post('/orders/:orderId/refund', async (req, res) => {
// //     const { orderId } = req.params;
// //     const { amount, reason } = req.body;

// //     try {
// //         const order = await Order.findById(orderId);
// //         if (!order) {
// //             return res.status(404).json({
// //                 success: false,
// //                 message: "Order not found"
// //             });
// //         }

// //         if (!order.paymentInfo?.paymentId || order.paymentInfo?.status !== 'captured') {
// //             return res.status(400).json({
// //                 success: false,
// //                 message: "Cannot refund: Payment not captured"
// //             });
// //         }

// //         if (order.refundInfo?.refundId) {
// //             return res.status(400).json({
// //                 success: false,
// //                 message: "Refund already processed for this order"
// //             });
// //         }

// //         const refundAmount = amount || order.totalAmount;
// //         const refund = await razorpayInstance.payments.refund(
// //             order.paymentInfo.paymentId,
// //             {
// //                 amount: Math.round(refundAmount * 100),
// //                 speed: 'optimum',
// //                 notes: { reason: reason || 'Manual refund by admin' }
// //             }
// //         );

// //         // Update order with refund info
// //         const estimatedSettlement = new Date();
// //         estimatedSettlement.setDate(estimatedSettlement.getDate() + 5);

// //         order.refundInfo = {
// //             refundId: refund.id,
// //             amount: refund.amount / 100,
// //             status: 'initiated',
// //             reason: reason || 'Manual refund by admin',
// //             initiatedAt: new Date(),
// //             estimatedSettlement: estimatedSettlement,
// //             speed: 'optimum'
// //         };

// //         await order.save();

// //         res.status(200).json({
// //             success: true,
// //             message: "Refund initiated successfully",
// //             refund: order.refundInfo
// //         });

// //     } catch (error) {
// //         console.error("Error processing refund:", error);
// //         res.status(500).json({
// //             success: false,
// //             message: "Failed to process refund",
// //             error: error.message
// //         });
// //     }
// // });

// // // Get refund status for specific order
// // router.get('/orders/:orderId/refund-status', async (req, res) => {
// //     const { orderId } = req.params;

// //     try {
// //         const order = await Order.findById(orderId);
// //         if (!order) {
// //             return res.status(404).json({
// //                 success: false,
// //                 message: "Order not found"
// //             });
// //         }

// //         let refundInfo = order.refundInfo;

// //         // If refund exists, fetch latest status from Razorpay
// //         if (order.refundInfo?.refundId && order.paymentInfo?.paymentId) {
// //             try {
// //                 const refunds = await razorpayInstance.payments.fetchMultipleRefund(order.paymentInfo.paymentId);
// //                 const latestRefund = refunds.items.find(r => r.id === order.refundInfo.refundId);

// //                 if (latestRefund) {
// //                     const estimatedSettlement = new Date(latestRefund.created_at * 1000);
// //                     estimatedSettlement.setDate(estimatedSettlement.getDate() + (latestRefund.speed_processed === 'optimum' ? 5 : 7));

// //                     refundInfo = {
// //                         refundId: latestRefund.id,
// //                         amount: latestRefund.amount / 100,
// //                         status: latestRefund.status === 'processed' ? 'processed' : 'initiated',
// //                         reason: order.refundInfo.reason || 'Refund processed',
// //                         initiatedAt: new Date(latestRefund.created_at * 1000),
// //                         processedAt: latestRefund.processed_at ? new Date(latestRefund.processed_at * 1000) : null,
// //                         estimatedSettlement: estimatedSettlement,
// //                         speed: latestRefund.speed_processed || 'optimum'
// //                     };

// //                     // Update in database
// //                     await Order.findByIdAndUpdate(orderId, { refundInfo });
// //                 }
// //             } catch (error) {
// //                 console.log('Error fetching refund status:', error.message);
// //             }
// //         }

// //         res.status(200).json({
// //             success: true,
// //             refundInfo: refundInfo
// //         });

// //     } catch (error) {
// //         console.error("Error fetching refund status:", error);
// //         res.status(500).json({
// //             success: false,
// //             message: "Failed to fetch refund status",
// //             error: error.message
// //         });
// //     }
// // });

// // // Get order count
// // router.get('/totalOrdercount', async (req, res) => {
// //     try {
// //         const count = await Order.countDocuments();
// //         res.status(200).json({
// //             success: true,
// //             totalOrders: count
// //         });
// //     } catch (error) {
// //         console.error("Error getting order count:", error);
// //         res.status(500).json({
// //             success: false,
// //             message: "Failed to get order count"
// //         });
// //     }
// // });

// // // Test route
// // router.get('/test', (req, res) => {
// //     res.json({
// //         success: true,
// //         message: "Order routes working!",
// //         timestamp: new Date().toISOString()
// //     });
// // });

// // module.exports = router;

// // // final:
// const express = require('express');
// const router = express.Router();
// const Order = require('../models/order');
// const Admin = require('../models/admin');
// const { logger } = require("../utils/logger");
// const Razorpay = require('razorpay');

// // Initialize Razorpay instance
// const razorpayInstance = new Razorpay({
//     key_id: process.env.RAZORPAY_KEY_ID,
//     key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// // Create Order Route - Fixed refund initialization
// router.post('/createOrder', async (req, res) => {
//     const { userId, items, address, phone, totalAmount } = req.body;

//     console.log("=== CREATE ORDER REQUEST ===");
//     console.log("Request body:", {
//         userId: !!userId,
//         items: items?.length,
//         address: !!address,
//         phone: !!phone,
//         totalAmount
//     });

//     // Comprehensive validation
//     if (!userId) {
//         return res.status(400).json({
//             success: false,
//             message: "User ID is required"
//         });
//     }

//     if (!items || !Array.isArray(items) || items.length === 0) {
//         return res.status(400).json({
//             success: false,
//             message: "Items are required and must be a non-empty array"
//         });
//     }

//     if (!address?.trim()) {
//         return res.status(400).json({
//             success: false,
//             message: "Address is required"
//         });
//     }

//     if (!phone?.trim()) {
//         return res.status(400).json({
//             success: false,
//             message: "Phone number is required"
//         });
//     }

//     if (!totalAmount || totalAmount <= 0) {
//         return res.status(400).json({
//             success: false,
//             message: "Valid total amount is required"
//         });
//     }

//     try {
//         // Fetch user details for email
//         const user = await Admin.findById(userId);
//         if (!user) {
//             return res.status(404).json({
//                 success: false,
//                 message: "User not found"
//             });
//         }

//         console.log("✅ User found:", user.email);

//         // Validate items structure
//         for (let i = 0; i < items.length; i++) {
//             const item = items[i];
//             if (!item.productId || !item.name || !item.quantity || item.quantity < 1 || !item.price || item.price < 0) {
//                 return res.status(400).json({
//                     success: false,
//                     message: `Invalid item at index ${i}. Each item needs productId, name, quantity (≥1), and price (≥0)`
//                 });
//             }
//         }

//         // Calculate and validate total
//         const calculatedTotal = items.reduce((total, item) => {
//             return total + (item.price * item.quantity);
//         }, 0);

//         if (Math.abs(totalAmount - calculatedTotal) > 0.01) {
//             return res.status(400).json({
//                 success: false,
//                 message: `Total amount mismatch. Expected: ${calculatedTotal}, Received: ${totalAmount}`
//             });
//         }

//         // Create Razorpay Order with customer details including email
//         const razorpayOrder = await razorpayInstance.orders.create({
//             amount: Math.round(totalAmount * 100), // Convert to paise
//             currency: "INR",
//             receipt: `receipt_${Date.now()}_${userId}`,
//             payment_capture: 1,
//             notes: {
//                 userId: userId,
//                 userEmail: user.email,
//                 userName: user.name,
//                 phone: phone,
//                 address: address
//             },
//             customer_details: {
//                 name: user.name || 'Customer',
//                 email: user.email,
//                 contact: phone
//             }
//         });

//         console.log("✅ Razorpay order created:", razorpayOrder.id);

//         // Create order in database WITHOUT default refund status
//         const newOrder = new Order({
//             userId,
//             userEmail: user.email,
//             userName: user.name,
//             items: items.map(item => ({
//                 productId: item.productId,
//                 name: item.name.trim(),
//                 quantity: parseInt(item.quantity),
//                 price: parseFloat(item.price)
//             })),
//             address: address.trim(),
//             phone: phone.trim(),
//             totalAmount: parseFloat(totalAmount),
//             razorpayOrderId: razorpayOrder.id,
//             paymentInfo: {
//                 amount: totalAmount,
//                 status: 'created',
//                 updatedAt: new Date()
//             },
//             // REMOVED: Default refundInfo initialization
//             status: 'Pending'
//         });

//         const savedOrder = await newOrder.save();

//         console.log("✅ Order saved to database:", savedOrder._id);

//         logger.info("Order created successfully", {
//             orderId: savedOrder._id,
//             razorpayOrderId: razorpayOrder.id,
//             userId,
//             userEmail: user.email,
//             totalAmount
//         });

//         res.status(201).json({
//             success: true,
//             message: "Order created successfully",
//             orderId: savedOrder._id,
//             razorpayOrderId: razorpayOrder.id,
//             order: {
//                 _id: savedOrder._id,
//                 status: savedOrder.status,
//                 totalAmount: savedOrder.totalAmount,
//                 createdAt: savedOrder.createdAt,
//                 userEmail: savedOrder.userEmail,
//                 userName: savedOrder.userName
//             }
//         });

//     } catch (error) {
//         console.error("❌ Error creating order:", error);
//         logger.error("Order creation failed", {
//             error: error.message,
//             stack: error.stack,
//             userId,
//             totalAmount
//         });

//         if (error.name === 'ValidationError') {
//             const validationErrors = Object.values(error.errors).map(e => e.message);
//             return res.status(400).json({
//                 success: false,
//                 message: "Validation failed: " + validationErrors.join(', ')
//             });
//         }

//         if (error.code === 11000) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Duplicate order detected. Please try again."
//             });
//         }

//         res.status(500).json({
//             success: false,
//             message: "Internal server error while creating order",
//             error: error.message
//         });
//     }
// });

// // // Update Order Status with PROPER Refund Processing
// router.put('/orders/:orderId/status', async (req, res) => {
//     const { orderId } = req.params;
//     const { status, cancelReason } = req.body;

//     console.log("=== UPDATE ORDER STATUS ===");
//     console.log("Order ID:", orderId, "New Status:", status, "Reason:", cancelReason);

//     if (!['Pending', 'Delivered', 'Cancelled'].includes(status)) {
//         return res.status(400).json({
//             success: false,
//             message: "Invalid status. Must be Pending, Delivered, or Cancelled"
//         });
//     }

//     try {
//         const order = await Order.findById(orderId);
//         if (!order) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Order not found"
//             });
//         }

//         let refundProcessed = false;
//         let refundDetails = null;

//         // FIXED: Only process refund when admin cancels AND payment is captured
//         if (status === 'Cancelled' && order.status !== 'Cancelled') {
//             console.log("🔍 Checking if refund should be processed...");
//             console.log("Payment Info:", order.paymentInfo);

//             // Check if payment exists and is captured
//             if (order.paymentInfo?.paymentId && order.paymentInfo?.status === 'captured') {
//                 console.log("💰 Processing automatic refund for cancelled order");

//                 try {
//                     const refund = await razorpayInstance.payments.refund(
//                         order.paymentInfo.paymentId,
//                         {
//                             amount: Math.round(order.totalAmount * 100), // Amount in paise
//                             speed: 'optimum',
//                             notes: {
//                                 reason: cancelReason || 'Order cancelled by admin',
//                                 orderId: order._id.toString(),
//                                 cancelledBy: 'admin'
//                             },
//                             receipt: `refund_${order._id}_${Date.now()}`
//                         }
//                     );

//                     console.log("✅ Refund initiated successfully:", refund.id);

//                     // Calculate estimated settlement date (5 days for optimum speed)
//                     const estimatedSettlement = new Date();
//                     estimatedSettlement.setDate(estimatedSettlement.getDate() + 5);

//                     // Update order with refund info
//                     order.refundInfo = {
//                         refundId: refund.id,
//                         amount: refund.amount / 100, // Convert from paise to rupees
//                         status: 'initiated',
//                         reason: cancelReason || 'Order cancelled by admin',
//                         initiatedAt: new Date(),
//                         estimatedSettlement: estimatedSettlement,
//                         speed: 'optimum',
//                         notes: `Refund processed automatically on order cancellation`
//                     };

//                     refundProcessed = true;
//                     refundDetails = order.refundInfo;

//                     logger.info("Refund initiated successfully", {
//                         orderId: order._id,
//                         refundId: refund.id,
//                         amount: refund.amount / 100,
//                         paymentId: order.paymentInfo.paymentId
//                     });

//                 } catch (refundError) {
//                     console.error("❌ Refund failed:", refundError);
//                     logger.error("Refund processing failed", {
//                         orderId,
//                         paymentId: order.paymentInfo.paymentId,
//                         error: refundError.message,
//                         errorCode: refundError.error?.code
//                     });

//                     // Set refund as failed
//                     order.refundInfo = {
//                         refundId: null,
//                         amount: order.totalAmount,
//                         status: 'failed',
//                         reason: `Refund failed: ${refundError.message}`,
//                         failedAt: new Date(),
//                         notes: 'Admin needs to process manual refund'
//                     };
//                 }
//             } else {
//                 console.log("⚠️ No refund needed - payment not captured or doesn't exist");
//                 console.log("Payment Status:", order.paymentInfo?.status);
//                 console.log("Payment ID:", order.paymentInfo?.paymentId);
//             }

//             // Update cancellation details
//             order.status = 'Cancelled';
//             order.cancelReason = cancelReason || 'Cancelled by admin';
//             order.cancelledBy = 'admin';
//             order.cancelledAt = new Date();

//         } else {
//             // Regular status update (non-cancellation)
//             order.status = status;
//         }

//         await order.save();

//         console.log("✅ Order status updated successfully");

//         const responseMessage = status === 'Cancelled'
//             ? `Order cancelled successfully! ${refundProcessed ? 'Automatic refund has been initiated and will be processed within 5-7 business days.' : 'No refund needed - payment was not captured.'}`
//             : 'Order status updated successfully';

//         res.status(200).json({
//             success: true,
//             message: responseMessage,
//             order: {
//                 _id: order._id,
//                 status: order.status,
//                 paymentInfo: order.paymentInfo,
//                 refundInfo: order.refundInfo,
//                 cancelReason: order.cancelReason,
//                 cancelledAt: order.cancelledAt
//             },
//             refundProcessed: refundProcessed,
//             refundDetails: refundDetails
//         });

//     } catch (error) {
//         console.error("❌ Error updating order status:", error);
//         logger.error("Error updating order status", { orderId, error: error.message });

//         res.status(500).json({
//             success: false,
//             message: "Failed to update order status",
//             error: error.message
//         });
//     }
// });

// // // 2:
// // Update Order Status with GUARANTEED Refund Processing
// // router.put('/orders/:orderId/status', async (req, res) => {
// //     const { orderId } = req.params;
// //     const { status, cancelReason } = req.body;

// //     console.log("=== UPDATE ORDER STATUS ===");
// //     console.log("Order ID:", orderId);
// //     console.log("New Status:", status);
// //     console.log("Cancel Reason:", cancelReason);

// //     if (!['Pending', 'Delivered', 'Cancelled'].includes(status)) {
// //         return res.status(400).json({ 
// //             success: false, 
// //             message: "Invalid status. Must be Pending, Delivered, or Cancelled" 
// //         });
// //     }

// //     try {
// //         const order = await Order.findById(orderId);
// //         if (!order) {
// //             return res.status(404).json({ 
// //                 success: false, 
// //                 message: "Order not found" 
// //             });
// //         }

// //         console.log("Found order:", {
// //             id: order._id,
// //             currentStatus: order.status,
// //             paymentStatus: order.paymentInfo?.status,
// //             paymentId: order.paymentInfo?.paymentId,
// //             totalAmount: order.totalAmount
// //         });

// //         let refundProcessed = false;
// //         let refundDetails = null;

// //         // CRITICAL: Process refund when admin cancels AND payment is captured
// //         if (status === 'Cancelled' && order.status !== 'Cancelled') {
// //             console.log(" Order is being cancelled - checking for refund eligibility...");

// //             // Check if payment exists and is captured
// //             if (order.paymentInfo?.paymentId && order.paymentInfo?.status === 'captured') {
// //                 console.log("💰 Payment is captured - initiating automatic refund");
// //                 console.log("Payment ID:", order.paymentInfo.paymentId);
// //                 console.log("Amount to refund:", order.totalAmount);

// //                 try {
// //                     // IMPORTANT: For small amounts, Razorpay charges fees
// //                     // For amounts less than ₹10, consider not processing automatic refund
// //                     if (order.totalAmount < 10) {
// //                         console.log("⚠️ Small amount detected - Razorpay fees may exceed refund amount");
// //                         console.log("Refund amount: ₹", order.totalAmount);
// //                         console.log("Expected fees: ₹10+");

// //                         // Still process the refund but warn about fees
// //                         const confirmRefund = true; // In production, you might want admin confirmation

// //                         if (!confirmRefund) {
// //                             console.log("❌ Refund cancelled due to high fees");
// //                             order.status = 'Cancelled';
// //                             order.cancelReason = `${cancelReason} (No refund - fees exceed amount)`;
// //                             order.cancelledBy = 'admin';
// //                             order.cancelledAt = new Date();

// //                             await order.save();

// //                             return res.status(200).json({
// //                                 success: true,
// //                                 message: "Order cancelled. Refund not processed due to high processing fees.",
// //                                 order: order,
// //                                 refundProcessed: false,
// //                                 feeWarning: true
// //                             });
// //                         }
// //                     }

// //                     // Process the refund via Razorpay API
// //                     console.log("🔄 Calling Razorpay refund API...");
// //                     const refund = await razorpayInstance.payments.refund(
// //                         order.paymentInfo.paymentId,
// //                         {
// //                             amount: Math.round(order.totalAmount * 100), // Convert to paise
// //                             speed: 'optimum',
// //                             notes: {
// //                                 reason: cancelReason || 'Order cancelled by admin',
// //                                 orderId: order._id.toString(),
// //                                 cancelledBy: 'admin',
// //                                 originalAmount: order.totalAmount
// //                             },
// //                             receipt: `refund_${order._id}_${Date.now()}`
// //                         }
// //                     );

// //                     console.log("✅ Refund API call successful:");
// //                     console.log("Refund ID:", refund.id);
// //                     console.log("Refund Amount:", refund.amount / 100);
// //                     console.log("Refund Status:", refund.status);

// //                     // Calculate estimated settlement date (5-7 days for optimum speed)
// //                     const estimatedSettlement = new Date();
// //                     estimatedSettlement.setDate(estimatedSettlement.getDate() + 5);

// //                     // Update order with refund information
// //                     order.refundInfo = {
// //                         refundId: refund.id,
// //                         amount: refund.amount / 100, // Convert from paise to rupees
// //                         status: 'initiated', // Razorpay returns 'pending' initially, we set as 'initiated'
// //                         reason: cancelReason || 'Order cancelled by admin',
// //                         initiatedAt: new Date(),
// //                         estimatedSettlement: estimatedSettlement,
// //                         speed: 'optimum',
// //                         notes: `Automatic refund processed on order cancellation by admin`
// //                     };

// //                     refundProcessed = true;
// //                     refundDetails = order.refundInfo;

// //                     console.log("💾 Updated refund info in order:");
// //                     console.log(JSON.stringify(order.refundInfo, null, 2));

// //                     logger.info("Refund initiated successfully", {
// //                         orderId: order._id,
// //                         refundId: refund.id,
// //                         amount: refund.amount / 100,
// //                         paymentId: order.paymentInfo.paymentId,
// //                         reason: cancelReason
// //                     });

// //                 } catch (refundError) {
// //                     console.error("❌ Refund API call failed:");
// //                     console.error("Error message:", refundError.message);
// //                     console.error("Error code:", refundError.error?.code);
// //                     console.error("Full error:", refundError);

// //                     logger.error("Refund processing failed", {
// //                         orderId,
// //                         paymentId: order.paymentInfo.paymentId,
// //                         error: refundError.message,
// //                         errorCode: refundError.error?.code,
// //                         amount: order.totalAmount
// //                     });

// //                     // Set refund as failed but still cancel the order
// //                     order.refundInfo = {
// //                         refundId: null,
// //                         amount: order.totalAmount,
// //                         status: 'failed',
// //                         reason: `Refund failed: ${refundError.message}`,
// //                         failedAt: new Date(),
// //                         notes: 'Automatic refund failed - admin should process manual refund via Razorpay dashboard'
// //                     };

// //                     console.log("⚠️ Refund failed but order will still be cancelled");
// //                 }
// //             } else {
// //                 console.log("ℹ️ No refund needed:");
// //                 console.log("- Payment ID exists:", !!order.paymentInfo?.paymentId);
// //                 console.log("- Payment status:", order.paymentInfo?.status);
// //                 console.log("- Payment captured:", order.paymentInfo?.status === 'captured');
// //             }

// //             // Update cancellation details regardless of refund success/failure
// //             order.status = 'Cancelled';
// //             order.cancelReason = cancelReason || 'Cancelled by admin';
// //             order.cancelledBy = 'admin';
// //             order.cancelledAt = new Date();

// //         } else {
// //             // Regular status update (non-cancellation)
// //             console.log("📝 Regular status update to:", status);
// //             order.status = status;
// //         }

// //         // Save the order with all updates
// //         await order.save();
// //         console.log("💾 Order saved successfully");

// //         const responseMessage = status === 'Cancelled' 
// //             ? `Order cancelled successfully! ${
// //                 refundProcessed 
// //                     ? `Automatic refund of ₹${refundDetails?.amount} has been initiated. Refund ID: ${refundDetails?.refundId}. Settlement expected in 5-7 business days.`
// //                     : order.refundInfo?.status === 'failed'
// //                         ? 'Automatic refund failed - please process manual refund via Razorpay dashboard.'
// //                         : 'No refund needed - payment was not captured.'
// //               }`
// //             : 'Order status updated successfully';

// //         console.log("📤 Sending response:", responseMessage);

// //         res.status(200).json({
// //             success: true,
// //             message: responseMessage,
// //             order: {
// //                 _id: order._id,
// //                 status: order.status,
// //                 paymentInfo: order.paymentInfo,
// //                 refundInfo: order.refundInfo,
// //                 cancelReason: order.cancelReason,
// //                 cancelledAt: order.cancelledAt
// //             },
// //             refundProcessed: refundProcessed,
// //             refundDetails: refundDetails
// //         });

// //     } catch (error) {
// //         console.error("❌ Error updating order status:", error);
// //         logger.error("Error updating order status", { 
// //             orderId, 
// //             error: error.message,
// //             stack: error.stack 
// //         });

// //         res.status(500).json({
// //             success: false,
// //             message: "Failed to update order status",
// //             error: error.message
// //         });
// //     }
// // });


// // Get Payment Status with enhanced refund tracking
// router.get('/paymentStatus/:orderId', async (req, res) => {
//     const { orderId } = req.params;

//     console.log("=== GET PAYMENT STATUS ===");
//     console.log("Order ID:", orderId);

//     try {
//         const order = await Order.findById(orderId);
//         if (!order) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Order not found"
//             });
//         }

//         let latestPaymentInfo = order.paymentInfo;
//         let latestRefundInfo = order.refundInfo;
//         let razorpayPayments = [];
//         let razorpayRefunds = [];

//         // Fetch live data from Razorpay
//         if (order.razorpayOrderId) {
//             try {
//                 const payments = await razorpayInstance.orders.fetchPayments(order.razorpayOrderId);
//                 razorpayPayments = payments.items;

//                 const latestPayment = payments.items.length ? payments.items[0] : null;
//                 if (latestPayment) {
//                     latestPaymentInfo = {
//                         paymentId: latestPayment.id,
//                         amount: latestPayment.amount / 100,
//                         status: latestPayment.status,
//                         method: latestPayment.method,
//                         capturedAt: latestPayment.captured_at ? new Date(latestPayment.captured_at * 1000) : null,
//                         failedAt: latestPayment.failed_at ? new Date(latestPayment.failed_at * 1000) : null,
//                         updatedAt: new Date()
//                     };

//                     // Fetch refunds for this payment if payment is captured
//                     if (latestPayment.status === 'captured') {
//                         try {
//                             const refunds = await razorpayInstance.payments.fetchMultipleRefund(latestPayment.id);
//                             razorpayRefunds = refunds.items;

//                             if (refunds.items.length > 0) {
//                                 const latestRefund = refunds.items[0];
//                                 const estimatedSettlement = new Date(latestRefund.created_at * 1000);
//                                 estimatedSettlement.setDate(estimatedSettlement.getDate() +
//                                     (latestRefund.speed_processed === 'optimum' ? 5 : 7));

//                                 latestRefundInfo = {
//                                     refundId: latestRefund.id,
//                                     amount: latestRefund.amount / 100,
//                                     status: latestRefund.status === 'processed' ? 'processed' : 'initiated',
//                                     reason: latestRefund.notes?.reason || order.cancelReason || 'Refund processed',
//                                     initiatedAt: new Date(latestRefund.created_at * 1000),
//                                     processedAt: latestRefund.processed_at ? new Date(latestRefund.processed_at * 1000) : null,
//                                     estimatedSettlement: estimatedSettlement,
//                                     speed: latestRefund.speed_processed || 'optimum',
//                                     notes: latestRefund.notes?.reason || 'Refund from order cancellation'
//                                 };
//                             } else {
//                                 // No refunds found but order might be cancelled - keep existing refundInfo or set to none
//                                 if (!order.refundInfo || order.refundInfo.status === 'none') {
//                                     latestRefundInfo = {
//                                         refundId: null,
//                                         amount: 0,
//                                         status: 'none',
//                                         reason: null,
//                                         initiatedAt: null,
//                                         processedAt: null,
//                                         estimatedSettlement: null,
//                                         speed: 'optimum',
//                                         notes: null
//                                     };
//                                 }
//                             }
//                         } catch (refundError) {
//                             console.log('No refunds found for payment:', latestPayment.id);
//                             // Set refund info to none if no refunds exist
//                             if (order.status !== 'Cancelled' || !order.refundInfo?.refundId) {
//                                 latestRefundInfo = {
//                                     refundId: null,
//                                     amount: 0,
//                                     status: 'none',
//                                     reason: null,
//                                     initiatedAt: null,
//                                     processedAt: null,
//                                     estimatedSettlement: null,
//                                     speed: 'optimum',
//                                     notes: null
//                                 };
//                             }
//                         }
//                     }

//                     // Update order with latest info
//                     await Order.findByIdAndUpdate(orderId, {
//                         paymentInfo: latestPaymentInfo,
//                         refundInfo: latestRefundInfo
//                     });
//                 }
//             } catch (razorpayError) {
//                 console.error("Error fetching from Razorpay:", razorpayError.message);
//             }
//         }

//         res.status(200).json({
//             success: true,
//             paymentInfo: latestPaymentInfo,
//             refundInfo: latestRefundInfo,
//             razorpayPayments,
//             razorpayRefunds,
//             order: {
//                 _id: order._id,
//                 status: order.status,
//                 totalAmount: order.totalAmount,
//                 createdAt: order.createdAt,
//                 userEmail: order.userEmail
//             }
//         });

//     } catch (error) {
//         console.error("❌ Error fetching payment status:", error);
//         logger.error("Error fetching payment status", { orderId, error: error.message });

//         res.status(500).json({
//             success: false,
//             message: "Failed to fetch payment status",
//             error: error.message
//         });
//     }
// });

// // Get refund status for specific order
// router.get('/orders/:orderId/refund-status', async (req, res) => {
//     const { orderId } = req.params;

//     try {
//         const order = await Order.findById(orderId);
//         if (!order) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Order not found"
//             });
//         }

//         let refundInfo = order.refundInfo;

//         // If refund exists, fetch latest status from Razorpay
//         if (order.refundInfo?.refundId && order.paymentInfo?.paymentId) {
//             try {
//                 const refunds = await razorpayInstance.payments.fetchMultipleRefund(order.paymentInfo.paymentId);
//                 const latestRefund = refunds.items.find(r => r.id === order.refundInfo.refundId);

//                 if (latestRefund) {
//                     const estimatedSettlement = new Date(latestRefund.created_at * 1000);
//                     estimatedSettlement.setDate(estimatedSettlement.getDate() +
//                         (latestRefund.speed_processed === 'optimum' ? 5 : 7));

//                     refundInfo = {
//                         refundId: latestRefund.id,
//                         amount: latestRefund.amount / 100,
//                         status: latestRefund.status === 'processed' ? 'processed' : 'initiated',
//                         reason: order.refundInfo.reason || 'Refund processed',
//                         initiatedAt: new Date(latestRefund.created_at * 1000),
//                         processedAt: latestRefund.processed_at ? new Date(latestRefund.processed_at * 1000) : null,
//                         estimatedSettlement: estimatedSettlement,
//                         speed: latestRefund.speed_processed || 'optimum',
//                         notes: order.refundInfo.notes
//                     };

//                     // Update in database
//                     await Order.findByIdAndUpdate(orderId, { refundInfo });
//                 }
//             } catch (error) {
//                 console.log('Error fetching refund status:', error.message);
//             }
//         }

//         res.status(200).json({
//             success: true,
//             refundInfo: refundInfo
//         });

//     } catch (error) {
//         console.error("Error fetching refund status:", error);
//         res.status(500).json({
//             success: false,
//             message: "Failed to fetch refund status",
//             error: error.message
//         });
//     }
// });

// // Get Orders by User ID with corrected refund status
// router.get('/orders/:userId', async (req, res) => {
//     const { userId } = req.params;

//     console.log("=== GET USER ORDERS ===");
//     console.log("User ID:", userId);

//     try {
//         const orders = await Order.find({ userId })
//             .sort({ createdAt: -1 })
//             .populate('items.productId', 'name media')
//             .lean();

//         console.log("✅ Found orders:", orders.length);

//         // Fetch live payment and refund status for each order
//         const ordersWithLiveStatus = await Promise.all(
//             orders.map(async (order) => {
//                 if (order.razorpayOrderId) {
//                     try {
//                         const payments = await razorpayInstance.orders.fetchPayments(order.razorpayOrderId);
//                         const latestPayment = payments.items.length ? payments.items[0] : null;

//                         if (latestPayment && latestPayment.id !== order.paymentInfo?.paymentId) {
//                             // Update payment info with latest data
//                             await Order.findByIdAndUpdate(order._id, {
//                                 'paymentInfo.paymentId': latestPayment.id,
//                                 'paymentInfo.status': latestPayment.status,
//                                 'paymentInfo.method': latestPayment.method,
//                                 'paymentInfo.updatedAt': new Date()
//                             });

//                             order.paymentInfo = {
//                                 ...order.paymentInfo,
//                                 paymentId: latestPayment.id,
//                                 status: latestPayment.status,
//                                 method: latestPayment.method,
//                                 updatedAt: new Date()
//                             };
//                         }

//                         // Check for refunds if order is cancelled and payment captured
//                         if (order.status === 'Cancelled' && latestPayment && latestPayment.status === 'captured') {
//                             try {
//                                 const refunds = await razorpayInstance.payments.fetchMultipleRefund(latestPayment.id);
//                                 if (refunds.items.length > 0) {
//                                     const latestRefund = refunds.items[0];
//                                     if (latestRefund.id !== order.refundInfo?.refundId) {
//                                         // Update refund info
//                                         const estimatedSettlement = new Date(latestRefund.created_at * 1000);
//                                         estimatedSettlement.setDate(estimatedSettlement.getDate() +
//                                             (latestRefund.speed_processed === 'optimum' ? 5 : 7));

//                                         await Order.findByIdAndUpdate(order._id, {
//                                             'refundInfo.refundId': latestRefund.id,
//                                             'refundInfo.amount': latestRefund.amount / 100,
//                                             'refundInfo.status': latestRefund.status === 'processed' ? 'processed' : 'initiated',
//                                             'refundInfo.processedAt': latestRefund.processed_at ? new Date(latestRefund.processed_at * 1000) : null,
//                                             'refundInfo.estimatedSettlement': estimatedSettlement,
//                                             'refundInfo.speed': latestRefund.speed_processed || 'optimum'
//                                         });

//                                         order.refundInfo = {
//                                             ...order.refundInfo,
//                                             refundId: latestRefund.id,
//                                             amount: latestRefund.amount / 100,
//                                             status: latestRefund.status === 'processed' ? 'processed' : 'initiated',
//                                             processedAt: latestRefund.processed_at ? new Date(latestRefund.processed_at * 1000) : null,
//                                             estimatedSettlement: estimatedSettlement,
//                                             speed: latestRefund.speed_processed || 'optimum'
//                                         };
//                                     }
//                                 } else {
//                                     // No refunds found but order is cancelled - ensure refund status is accurate
//                                     if (!order.refundInfo?.refundId) {
//                                         await Order.findByIdAndUpdate(order._id, {
//                                             'refundInfo.status': 'none'
//                                         });
//                                         order.refundInfo = { ...order.refundInfo, status: 'none' };
//                                     }
//                                 }
//                             } catch (refundError) {
//                                 console.log('No refunds found for payment:', latestPayment.id);
//                                 if (!order.refundInfo?.refundId) {
//                                     order.refundInfo = { ...order.refundInfo, status: 'none' };
//                                 }
//                             }
//                         } else if (order.status !== 'Cancelled') {
//                             // Order not cancelled, ensure no refund status unless already processed
//                             if (!order.refundInfo?.refundId) {
//                                 order.refundInfo = { ...order.refundInfo, status: 'none' };
//                             }
//                         }
//                     } catch (paymentError) {
//                         console.log('Error fetching payment for order:', order._id, paymentError.message);
//                     }
//                 }
//                 return order;
//             })
//         );

//         logger.info("User orders fetched successfully", { userId, count: orders.length });

//         res.status(200).json({
//             success: true,
//             orders: ordersWithLiveStatus,
//             totalCount: orders.length
//         });

//     } catch (error) {
//         console.error("Error fetching user orders:", error);
//         logger.error("Error fetching user orders", { error: error.message, userId });

//         res.status(500).json({
//             success: false,
//             message: "Failed to fetch orders",
//             error: error.message
//         });
//     }
// });

// // Get All Orders (Admin) with complete information
// router.get('/orders', async (req, res) => {
//     console.log("=== GET ALL ORDERS (ADMIN) ===");

//     try {
//         const orders = await Order.find()
//             .sort({ createdAt: -1 })
//             .populate('userId', 'name email phone')
//             .populate('items.productId', 'name media')
//             .lean();

//         console.log("Found all orders:", orders.length);

//         logger.info("All orders fetched successfully", { count: orders.length });

//         res.status(200).json({
//             success: true,
//             orders: orders,
//             totalCount: orders.length
//         });

//     } catch (error) {
//         console.error("Error fetching all orders:", error);
//         logger.error("Error fetching all orders", { error: error.message });

//         res.status(500).json({
//             success: false,
//             message: "Failed to fetch orders",
//             error: error.message
//         });
//     }
// });

// // Capture Payment endpoint
// router.post('/capturePayment/:orderId', async (req, res) => {
//     const { orderId } = req.params;

//     console.log("=== CAPTURE PAYMENT ===");
//     console.log("Order ID:", orderId);

//     try {
//         const order = await Order.findById(orderId);
//         if (!order) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Order not found"
//             });
//         }

//         if (!order.paymentInfo?.paymentId) {
//             return res.status(400).json({
//                 success: false,
//                 message: "No payment found for this order"
//             });
//         }

//         if (order.paymentInfo.status !== 'authorized') {
//             return res.status(400).json({
//                 success: false,
//                 message: "Payment is not in authorized state"
//             });
//         }

//         // Capture the payment
//         const capturedPayment = await razorpayInstance.payments.capture(
//             order.paymentInfo.paymentId,
//             Math.round(order.totalAmount * 100),
//             'INR'
//         );

//         // Update order with captured payment info
//         order.paymentInfo.status = 'captured';
//         order.paymentInfo.capturedAt = new Date();
//         order.paymentInfo.updatedAt = new Date();

//         await order.save();

//         console.log("Payment captured successfully");

//         res.status(200).json({
//             success: true,
//             message: "Payment captured successfully",
//             paymentInfo: order.paymentInfo
//         });

//     } catch (error) {
//         console.error("Error capturing payment:", error);
//         res.status(500).json({
//             success: false,
//             message: "Failed to capture payment",
//             error: error.message
//         });
//     }
// });

// // Manual refund endpoint for admins
// router.post('/orders/:orderId/refund', async (req, res) => {
//     const { orderId } = req.params;
//     const { amount, reason } = req.body;

//     try {
//         const order = await Order.findById(orderId);
//         if (!order) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Order not found"
//             });
//         }

//         if (!order.paymentInfo?.paymentId || order.paymentInfo?.status !== 'captured') {
//             return res.status(400).json({
//                 success: false,
//                 message: "Cannot refund: Payment not captured"
//             });
//         }

//         if (order.refundInfo?.refundId) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Refund already processed for this order"
//             });
//         }

//         const refundAmount = amount || order.totalAmount;
//         const refund = await razorpayInstance.payments.refund(
//             order.paymentInfo.paymentId,
//             {
//                 amount: Math.round(refundAmount * 100),
//                 speed: 'optimum',
//                 notes: { reason: reason || 'Manual refund by admin' }
//             }
//         );

//         // Update order with refund info
//         const estimatedSettlement = new Date();
//         estimatedSettlement.setDate(estimatedSettlement.getDate() + 5);

//         order.refundInfo = {
//             refundId: refund.id,
//             amount: refund.amount / 100,
//             status: 'initiated',
//             reason: reason || 'Manual refund by admin',
//             initiatedAt: new Date(),
//             estimatedSettlement: estimatedSettlement,
//             speed: 'optimum'
//         };

//         await order.save();

//         res.status(200).json({
//             success: true,
//             message: "Refund initiated successfully",
//             refund: order.refundInfo
//         });

//     } catch (error) {
//         console.error("Error processing refund:", error);
//         res.status(500).json({
//             success: false,
//             message: "Failed to process refund",
//             error: error.message
//         });
//     }
// });

// // Get order count
// router.get('/totalOrdercount', async (req, res) => {
//     try {
//         const count = await Order.countDocuments();
//         res.status(200).json({
//             success: true,
//             totalOrders: count
//         });
//     } catch (error) {
//         console.error("Error getting order count:", error);
//         res.status(500).json({
//             success: false,
//             message: "Failed to get order count"
//         });
//     }
// });

// // Test route
// router.get('/test', (req, res) => {
//     res.json({
//         success: true,
//         message: "Order routes working!",
//         timestamp: new Date().toISOString()
//     });
// });

// module.exports = router;


// // finallll::
const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const Admin = require('../models/admin');
const { logger } = require("../utils/logger");
const Razorpay = require('razorpay');

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// // 1. Create Order Route
// router.post('/createOrder', async (req, res) => {
//     const { userId, items, address, phone, totalAmount } = req.body;

//     console.log("=== CREATE ORDER REQUEST ===");
//     console.log("Request body:", {
//         userId: !!userId,
//         items: items?.length,
//         address: !!address,
//         phone: !!phone,
//         totalAmount
//     });

//     // Comprehensive validation
//     if (!userId) {
//         return res.status(400).json({
//             success: false,
//             message: "User ID is required"
//         });
//     }

//     if (!items || !Array.isArray(items) || items.length === 0) {
//         return res.status(400).json({
//             success: false,
//             message: "Items are required and must be a non-empty array"
//         });
//     }

//     if (!address?.trim()) {
//         return res.status(400).json({
//             success: false,
//             message: "Address is required"
//         });
//     }

//     if (!phone?.trim()) {
//         return res.status(400).json({
//             success: false,
//             message: "Phone number is required"
//         });
//     }

//     if (!totalAmount || totalAmount <= 0) {
//         return res.status(400).json({
//             success: false,
//             message: "Valid total amount is required"
//         });
//     }

//     try {
//         // Fetch user details for email
//         const user = await Admin.findById(userId);
//         if (!user) {
//             return res.status(404).json({
//                 success: false,
//                 message: "User not found"
//             });
//         }

//         console.log("User found:", user.email);

//         // Validate items structure
//         for (let i = 0; i < items.length; i++) {
//             const item = items[i];
//             if (!item.productId || !item.name || !item.quantity || item.quantity < 1 || !item.price || item.price < 0) {
//                 return res.status(400).json({
//                     success: false,
//                     message: `Invalid item at index ${i}. Each item needs productId, name, quantity (≥1), and price (≥0)`
//                 });
//             }
//         }

//         // Calculate and validate total
//         const calculatedTotal = items.reduce((total, item) => {
//             return total + (item.price * item.quantity);
//         }, 0);

//         if (Math.abs(totalAmount - calculatedTotal) > 0.01) {
//             return res.status(400).json({
//                 success: false,
//                 message: `Total amount mismatch. Expected: ${calculatedTotal}, Received: ${totalAmount}`
//             });
//         }

//         // Create Razorpay Order with customer details including email
//         const razorpayOrder = await razorpayInstance.orders.create({
//             amount: Math.round(totalAmount * 100), // Convert to paise
//             currency: "INR",
//             receipt: `receipt_${Date.now()}_${userId}`,
//             payment_capture: 1,
//             notes: {
//                 userId: userId,
//                 userEmail: user.email,
//                 userName: user.name,
//                 phone: phone,
//                 address: address
//             },
//             customer_details: {
//                 name: user.name || 'Customer',
//                 email: user.email,
//                 contact: phone
//             }
//         });

//         console.log("Razorpay order created:", razorpayOrder.id);

//         // Create order in database
//         const newOrder = new Order({
//             userId,
//             userEmail: user.email,
//             userName: user.name,
//             items: items.map(item => ({
//                 productId: item.productId,
//                 name: item.name.trim(),
//                 quantity: parseInt(item.quantity),
//                 price: parseFloat(item.price)
//             })),
//             address: address.trim(),
//             phone: phone.trim(),
//             totalAmount: parseFloat(totalAmount),
//             razorpayOrderId: razorpayOrder.id,
//             paymentInfo: {
//                 amount: totalAmount,
//                 status: 'created',
//                 updatedAt: new Date()
//             },
//             status: 'Pending'
//         });

//         const savedOrder = await newOrder.save();

//         console.log("Order saved to database:", savedOrder._id);

//         logger.info("Order created successfully", {
//             orderId: savedOrder._id,
//             razorpayOrderId: razorpayOrder.id,
//             userId,
//             userEmail: user.email,
//             totalAmount
//         });

//         res.status(201).json({
//             success: true,
//             message: "Order created successfully",
//             orderId: savedOrder._id,
//             razorpayOrderId: razorpayOrder.id,
//             order: {
//                 _id: savedOrder._id,
//                 status: savedOrder.status,
//                 totalAmount: savedOrder.totalAmount,
//                 createdAt: savedOrder.createdAt,
//                 userEmail: savedOrder.userEmail,
//                 userName: savedOrder.userName
//             }
//         });

//     } catch (error) {
//         console.error("Error creating order:", error);
//         logger.error("Order creation failed", {
//             error: error.message,
//             stack: error.stack,
//             userId,
//             totalAmount
//         });

//         if (error.name === 'ValidationError') {
//             const validationErrors = Object.values(error.errors).map(e => e.message);
//             return res.status(400).json({
//                 success: false,
//                 message: "Validation failed: " + validationErrors.join(', ')
//             });
//         }

//         if (error.code === 11000) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Duplicate order detected. Please try again."
//             });
//         }

//         res.status(500).json({
//             success: false,
//             message: "Internal server error while creating order",
//             error: error.message
//         });
//     }
// });

// // 2. 
// Create Order Route - Fixed for all edge cases
router.post('/createOrder', async (req, res) => {
    const { userId, items, address, phone, totalAmount } = req.body;

    console.log("=== CREATE ORDER REQUEST ===");
    console.log("Full request body:", JSON.stringify(req.body, null, 2));

    try {
        // Comprehensive validation
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Items are required and must be a non-empty array"
            });
        }

        if (!address?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Address is required"
            });
        }

        if (!phone?.toString().trim()) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required"
            });
        }

        if (!totalAmount || totalAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Valid total amount is required"
            });
        }

        // Fetch user details
        console.log("Fetching user with ID:", userId);
        const user = await Admin.findById(userId);
        if (!user) {
            console.error("User not found:", userId);
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        console.log("User found:", {
            id: user._id,
            email: user.email,
            name: user.name
        });

        // Validate items structure
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            console.log(`Validating item ${i}:`, item);

            if (!item.productId || !item.name || !item.quantity || item.quantity < 1 || item.price === undefined || item.price < 0) {
                console.error(`Invalid item at index ${i}:`, item);
                return res.status(400).json({
                    success: false,
                    message: `Invalid item at index ${i}. Each item needs productId, name, quantity (≥1), and price (≥0)`
                });
            }
        }

        // Calculate and validate total
        const calculatedTotal = items.reduce((total, item) => {
            return total + (parseFloat(item.price) * parseInt(item.quantity));
        }, 0);

        console.log("Amount validation:", {
            calculatedTotal,
            providedTotal: totalAmount,
            difference: Math.abs(totalAmount - calculatedTotal)
        });

        if (Math.abs(totalAmount - calculatedTotal) > 0.01) {
            return res.status(400).json({
                success: false,
                message: `Total amount mismatch. Expected: ${calculatedTotal}, Received: ${totalAmount}`
            });
        }

        // Prepare phone number (ensure it starts with +91 and has 10 digits)
        let formattedPhone = phone.toString().trim();
        // Remove any existing country code
        formattedPhone = formattedPhone.replace(/^\+91/, '').replace(/^91/, '');
        // Validate 10 digits
        if (!/^\d{10}$/.test(formattedPhone)) {
            return res.status(400).json({
                success: false,
                message: "Phone number must be exactly 10 digits"
            });
        }
        formattedPhone = `+91${formattedPhone}`;

        console.log("Formatted phone:", formattedPhone);

        // Check if razorpayInstance is properly initialized
        if (!razorpayInstance) {
            console.error("Razorpay instance not initialized!");
            return res.status(500).json({
                success: false,
                message: "Payment gateway configuration error. Please contact support.",
                error: "Razorpay not initialized"
            });
        }

        // Verify Razorpay credentials are set
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            console.error("Razorpay credentials missing in environment variables");
            return res.status(500).json({
                success: false,
                message: "Payment gateway configuration error. Please contact support.",
                error: "Missing Razorpay credentials"
            });
        }

        console.log("Razorpay credentials present:", {
            keyId: process.env.RAZORPAY_KEY_ID?.substring(0, 10) + '...',
            keySecretPresent: !!process.env.RAZORPAY_KEY_SECRET
        });

        // Create Razorpay Order with minimal required fields
        console.log("Creating Razorpay order...");
        const amountInPaise = Math.round(totalAmount * 100);
        
        const razorpayOrderData = {
            amount: amountInPaise,
            currency: "INR",
            receipt: `order_${Date.now()}_${userId.toString().slice(-6)}`,
            notes: {
                userId: userId.toString(),
                phone: formattedPhone,
                itemCount: items.length.toString()
            }
        };

        console.log("Razorpay order request:", JSON.stringify(razorpayOrderData, null, 2));

        let razorpayOrder;
        try {
            razorpayOrder = await razorpayInstance.orders.create(razorpayOrderData);
            console.log("Razorpay order created successfully:", {
                id: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                status: razorpayOrder.status
            });
        } catch (razorpayError) {
            console.error("=== RAZORPAY ERROR ===");
            console.error("Error type:", razorpayError.constructor.name);
            console.error("Error message:", razorpayError.message);
            console.error("Error details:", JSON.stringify(razorpayError, null, 2));
            
            // Extract detailed error info
            let errorDetails = "Unknown error";
            if (razorpayError.error) {
                errorDetails = JSON.stringify(razorpayError.error);
            } else if (razorpayError.description) {
                errorDetails = razorpayError.description;
            } else if (razorpayError.message) {
                errorDetails = razorpayError.message;
            }
            
            console.error("Extracted error details:", errorDetails);
            
            return res.status(500).json({
                success: false,
                message: "Failed to create payment order. Please try again.",
                error: "Payment gateway error",
                details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
            });
        }

        // Create order in database
        console.log("Creating database order...");
        const orderData = {
            userId: userId,
            userEmail: user.email || '',
            userName: user.name || 'Customer',
            items: items.map(item => ({
                productId: item.productId.toString(),
                name: item.name.toString().trim(),
                quantity: parseInt(item.quantity),
                price: parseFloat(item.price)
            })),
            address: address.toString().trim(),
            phone: formattedPhone,
            totalAmount: parseFloat(totalAmount),
            razorpayOrderId: razorpayOrder.id,
            paymentInfo: {
                amount: parseFloat(totalAmount),
                status: 'created',
                razorpayOrderId: razorpayOrder.id,
                updatedAt: new Date()
            },
            status: 'Pending',
            createdAt: new Date()
        };

        console.log("Database order data:", JSON.stringify(orderData, null, 2));

        let savedOrder;
        try {
            const newOrder = new Order(orderData);
            savedOrder = await newOrder.save();
            console.log("Database order created successfully:", savedOrder._id);
        } catch (dbError) {
            console.error("=== DATABASE ERROR ===");
            console.error("Error name:", dbError.name);
            console.error("Error message:", dbError.message);
            console.error("Error details:", JSON.stringify(dbError, null, 2));

            // Handle specific database errors
            if (dbError.name === 'ValidationError') {
                const validationErrors = Object.values(dbError.errors).map(e => e.message);
                return res.status(400).json({
                    success: false,
                    message: "Order validation failed: " + validationErrors.join(', '),
                    razorpayOrderId: razorpayOrder.id
                });
            }

            if (dbError.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: "Duplicate order detected. Please try again.",
                    razorpayOrderId: razorpayOrder.id
                });
            }

            return res.status(500).json({
                success: false,
                message: "Failed to save order. Please contact support with Razorpay Order ID: " + razorpayOrder.id,
                error: "Database error",
                razorpayOrderId: razorpayOrder.id
            });
        }

        // Log success
        if (typeof logger !== 'undefined' && logger && typeof logger.info === 'function') {
            logger.info("Order created successfully", {
                orderId: savedOrder._id,
                razorpayOrderId: razorpayOrder.id,
                userId,
                totalAmount
            });
        }

        console.log("=== ORDER CREATION SUCCESS ===");

        // Send success response
        res.status(201).json({
            success: true,
            message: "Order created successfully",
            orderId: savedOrder._id.toString(),
            razorpayOrderId: razorpayOrder.id,
            order: {
                _id: savedOrder._id.toString(),
                status: savedOrder.status,
                totalAmount: savedOrder.totalAmount,
                createdAt: savedOrder.createdAt,
                userEmail: savedOrder.userEmail,
                userName: savedOrder.userName
            }
        });

    } catch (error) {
        console.error("=== UNEXPECTED ERROR ===");
        console.error("Error type:", error.constructor.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        console.error("Request data:", { 
            userId, 
            itemsCount: items?.length, 
            totalAmount,
            address: address?.substring(0, 50) + '...'
        });

        // Log the error if logger is available
        if (typeof logger !== 'undefined' && logger && typeof logger.error === 'function') {
            logger.error("Order creation failed", {
                error: error.message,
                stack: error.stack,
                userId,
                totalAmount,
                itemsCount: items?.length
            });
        }

        // Handle different types of errors
        let errorMessage = "Failed to create order. Please try again.";
        let statusCode = 500;

        if (error.name === 'CastError') {
            errorMessage = "Invalid data format provided";
            statusCode = 400;
        } else if (error.name === 'ValidationError') {
            errorMessage = "Order data validation failed";
            statusCode = 400;
        } else if (error.code === 11000) {
            errorMessage = "Duplicate order detected";
            statusCode = 400;
        }

        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
        });
    }
});

// Update Order Status with GUARANTEED Refund Processing
router.put('/orders/:orderId/status', async (req, res) => {
    const { orderId } = req.params;
    const { status, cancelReason } = req.body;

    console.log("=== UPDATE ORDER STATUS ===");
    console.log("Order ID:", orderId);
    console.log("New Status:", status);
    console.log("Cancel Reason:", cancelReason);

    if (!['Pending', 'Delivered', 'Cancelled'].includes(status)) {
        return res.status(400).json({
            success: false,
            message: "Invalid status. Must be Pending, Delivered, or Cancelled"
        });
    }

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        console.log("Current order state:", {
            id: order._id,
            status: order.status,
            paymentStatus: order.paymentInfo?.status,
            paymentId: order.paymentInfo?.paymentId,
            totalAmount: order.totalAmount
        });

        let refundProcessed = false;
        let refundDetails = null;

        // Process refund when admin cancels AND payment is captured
        if (status === 'Cancelled' && order.status !== 'Cancelled') {
            console.log("Order being cancelled - checking refund eligibility...");

            // Check if payment exists and is captured
            if (order.paymentInfo?.paymentId && order.paymentInfo?.status === 'captured') {
                console.log("Payment captured - processing refund");
                console.log("Payment ID:", order.paymentInfo.paymentId);
                console.log("Amount:", order.totalAmount);

                try {
                    // Call Razorpay refund API
                    console.log("Calling Razorpay refund API...");
                    const refund = await razorpayInstance.payments.refund(
                        order.paymentInfo.paymentId,
                        {
                            amount: Math.round(order.totalAmount * 100), // Convert to paise
                            speed: 'optimum',
                            notes: {
                                reason: cancelReason || 'Order cancelled by admin',
                                orderId: order._id.toString(),
                                cancelledBy: 'admin'
                            },
                            receipt: `refund_${order._id}_${Date.now()}`
                        }
                    );

                    console.log("Refund API success:");
                    console.log("Refund ID:", refund.id);
                    console.log("Refund Amount:", refund.amount / 100);
                    console.log("Refund Status:", refund.status);

                    // Calculate estimated settlement date
                    const estimatedSettlement = new Date();
                    estimatedSettlement.setDate(estimatedSettlement.getDate() + 5);

                    // Update order with refund information
                    order.refundInfo = {
                        refundId: refund.id,
                        amount: refund.amount / 100,
                        status: 'initiated',
                        reason: cancelReason || 'Order cancelled by admin',
                        initiatedAt: new Date(),
                        estimatedSettlement: estimatedSettlement,
                        speed: 'optimum',
                        notes: 'Automatic refund processed on order cancellation'
                    };

                    refundProcessed = true;
                    refundDetails = order.refundInfo;

                    console.log("Refund info updated in order");

                    logger.info("Refund initiated successfully", {
                        orderId: order._id,
                        refundId: refund.id,
                        amount: refund.amount / 100,
                        paymentId: order.paymentInfo.paymentId
                    });

                } catch (refundError) {
                    console.error("Refund API failed:");
                    console.error("Error:", refundError.message);
                    console.error("Code:", refundError.error?.code);

                    logger.error("Refund processing failed", {
                        orderId,
                        paymentId: order.paymentInfo.paymentId,
                        error: refundError.message,
                        errorCode: refundError.error?.code
                    });

                    // Set refund as failed
                    order.refundInfo = {
                        refundId: null,
                        amount: order.totalAmount,
                        status: 'failed',
                        reason: `Refund failed: ${refundError.message}`,
                        failedAt: new Date(),
                        notes: 'Automatic refund failed - manual processing required'
                    };

                    console.log("Refund failed but order will still be cancelled");
                }
            } else {
                console.log("No refund needed - payment not captured");
                console.log("Payment ID exists:", !!order.paymentInfo?.paymentId);
                console.log("Payment status:", order.paymentInfo?.status);
            }

            // Update cancellation details
            order.status = 'Cancelled';
            order.cancelReason = cancelReason || 'Cancelled by admin';
            order.cancelledBy = 'admin';
            order.cancelledAt = new Date();

        } else {
            // Regular status update
            console.log("Regular status update to:", status);
            order.status = status;
        }

        // Save the order
        await order.save();
        console.log("Order saved successfully");

        const responseMessage = status === 'Cancelled'
            ? `Order cancelled successfully! ${refundProcessed
                ? `Refund of ₹${refundDetails?.amount} initiated. Refund ID: ${refundDetails?.refundId}. Settlement expected in 5-7 days.`
                : order.refundInfo?.status === 'failed'
                    ? 'Automatic refund failed - manual processing required.'
                    : 'No refund needed - payment not captured.'
            }`
            : 'Order status updated successfully';

        res.status(200).json({
            success: true,
            message: responseMessage,
            order: {
                _id: order._id,
                status: order.status,
                paymentInfo: order.paymentInfo,
                refundInfo: order.refundInfo,
                cancelReason: order.cancelReason,
                cancelledAt: order.cancelledAt
            },
            refundProcessed: refundProcessed,
            refundDetails: refundDetails
        });

    } catch (error) {
        console.error("Error updating order status:", error);
        logger.error("Error updating order status", {
            orderId,
            error: error.message
        });

        res.status(500).json({
            success: false,
            message: "Failed to update order status",
            error: error.message
        });
    }
});

// Get Payment Status
router.get('/paymentStatus/:orderId', async (req, res) => {
    const { orderId } = req.params;

    console.log("=== GET PAYMENT STATUS ===");
    console.log("Order ID:", orderId);

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        let latestPaymentInfo = order.paymentInfo;
        let latestRefundInfo = order.refundInfo;

        // Fetch live data from Razorpay if order exists
        if (order.razorpayOrderId) {
            try {
                const payments = await razorpayInstance.orders.fetchPayments(order.razorpayOrderId);
                const latestPayment = payments.items.length ? payments.items[0] : null;

                if (latestPayment) {
                    latestPaymentInfo = {
                        paymentId: latestPayment.id,
                        amount: latestPayment.amount / 100,
                        status: latestPayment.status,
                        method: latestPayment.method,
                        capturedAt: latestPayment.captured_at ? new Date(latestPayment.captured_at * 1000) : null,
                        failedAt: latestPayment.failed_at ? new Date(latestPayment.failed_at * 1000) : null,
                        updatedAt: new Date()
                    };

                    // Fetch refunds if payment is captured
                    if (latestPayment.status === 'captured') {
                        try {
                            const refunds = await razorpayInstance.payments.fetchMultipleRefund(latestPayment.id);

                            if (refunds.items.length > 0) {
                                const latestRefund = refunds.items[0];
                                const estimatedSettlement = new Date(latestRefund.created_at * 1000);
                                estimatedSettlement.setDate(estimatedSettlement.getDate() + 5);

                                latestRefundInfo = {
                                    refundId: latestRefund.id,
                                    amount: latestRefund.amount / 100,
                                    status: latestRefund.status === 'processed' ? 'processed' : 'initiated',
                                    reason: latestRefund.notes?.reason || order.cancelReason || 'Refund processed',
                                    initiatedAt: new Date(latestRefund.created_at * 1000),
                                    processedAt: latestRefund.processed_at ? new Date(latestRefund.processed_at * 1000) : null,
                                    estimatedSettlement: estimatedSettlement,
                                    speed: 'optimum',
                                    notes: 'Refund from order cancellation'
                                };
                            } else if (order.status === 'Cancelled' && !order.refundInfo?.refundId) {
                                // Order is cancelled but no refund exists
                                latestRefundInfo = {
                                    refundId: null,
                                    amount: 0,
                                    status: 'none',
                                    reason: null,
                                    initiatedAt: null,
                                    processedAt: null,
                                    estimatedSettlement: null,
                                    speed: null,
                                    notes: null
                                };
                            }
                        } catch (refundError) {
                            console.log('No refunds found for payment:', latestPayment.id);
                        }
                    }

                    // Update order with latest info
                    await Order.findByIdAndUpdate(orderId, {
                        paymentInfo: latestPaymentInfo,
                        refundInfo: latestRefundInfo
                    });
                }
            } catch (razorpayError) {
                console.error("Error fetching from Razorpay:", razorpayError.message);
            }
        }

        res.status(200).json({
            success: true,
            paymentInfo: latestPaymentInfo,
            refundInfo: latestRefundInfo,
            order: {
                _id: order._id,
                status: order.status,
                totalAmount: order.totalAmount,
                createdAt: order.createdAt,
                userEmail: order.userEmail
            }
        });

    } catch (error) {
        console.error("Error fetching payment status:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch payment status",
            error: error.message
        });
    }
});

// Get Orders by User ID
router.get('/orders/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const orders = await Order.find({ userId })
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            orders: orders,
            totalCount: orders.length
        });

    } catch (error) {
        console.error("Error fetching user orders:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch orders",
            error: error.message
        });
    }
});

// Get All Orders (Admin)
router.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .populate('userId', 'name email phone')
            .lean();

        res.status(200).json({
            success: true,
            orders: orders,
            totalCount: orders.length
        });

    } catch (error) {
        console.error("Error fetching all orders:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch orders",
            error: error.message
        });
    }
});

// Get refund status for specific order
router.get('/orders/:orderId/refund-status', async (req, res) => {
    const { orderId } = req.params;

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        let refundInfo = order.refundInfo || { status: 'none' };

        // If refund exists, fetch latest status from Razorpay
        if (order.refundInfo?.refundId && order.paymentInfo?.paymentId) {
            try {
                const refunds = await razorpayInstance.payments.fetchMultipleRefund(order.paymentInfo.paymentId);
                const latestRefund = refunds.items.find(r => r.id === order.refundInfo.refundId);

                if (latestRefund) {
                    const estimatedSettlement = new Date(latestRefund.created_at * 1000);
                    estimatedSettlement.setDate(estimatedSettlement.getDate() + 5);

                    refundInfo = {
                        refundId: latestRefund.id,
                        amount: latestRefund.amount / 100,
                        status: latestRefund.status === 'processed' ? 'processed' : 'initiated',
                        reason: order.refundInfo.reason || 'Refund processed',
                        initiatedAt: new Date(latestRefund.created_at * 1000),
                        processedAt: latestRefund.processed_at ? new Date(latestRefund.processed_at * 1000) : null,
                        estimatedSettlement: estimatedSettlement,
                        speed: 'optimum',
                        notes: order.refundInfo.notes
                    };

                    // Update in database
                    await Order.findByIdAndUpdate(orderId, { refundInfo });
                }
            } catch (error) {
                console.log('Error fetching refund status:', error.message);
            }
        }

        res.status(200).json({
            success: true,
            refundInfo: refundInfo
        });

    } catch (error) {
        console.error("Error fetching refund status:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch refund status",
            error: error.message
        });
    }
});

// Capture Payment
router.post('/capturePayment/:orderId', async (req, res) => {
    const { orderId } = req.params;

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        if (!order.paymentInfo?.paymentId) {
            return res.status(400).json({
                success: false,
                message: "No payment found for this order"
            });
        }

        if (order.paymentInfo.status !== 'authorized') {
            return res.status(400).json({
                success: false,
                message: "Payment is not in authorized state"
            });
        }

        // Capture the payment
        const capturedPayment = await razorpayInstance.payments.capture(
            order.paymentInfo.paymentId,
            Math.round(order.totalAmount * 100),
            'INR'
        );

        // Update order
        order.paymentInfo.status = 'captured';
        order.paymentInfo.capturedAt = new Date();
        order.paymentInfo.updatedAt = new Date();

        await order.save();

        res.status(200).json({
            success: true,
            message: "Payment captured successfully",
            paymentInfo: order.paymentInfo
        });

    } catch (error) {
        console.error("Error capturing payment:", error);
        res.status(500).json({
            success: false,
            message: "Failed to capture payment",
            error: error.message
        });
    }
});

// Get order count
router.get('/totalOrdercount', async (req, res) => {
    try {
        const count = await Order.countDocuments();
        res.status(200).json({
            success: true,
            totalOrders: count
        });
    } catch (error) {
        console.error("Error getting order count:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get order count"
        });
    }
});

// Test route
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: "Order routes working!",
        timestamp: new Date().toISOString()
    });
});

module.exports = router;

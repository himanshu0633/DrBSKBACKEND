const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const Admin = require('../models/admin');
const Product = require('../models/product');
const { logger } = require("../utils/logger");
const Razorpay = require('razorpay');
const crypto = require('crypto');
// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
    key_id:"rzp_test_RpQ1JwSJEy6yAw",
    key_secret: "1XsoSE1HMxnMUbIoC3V3An6n",
});

// Helper function to process media URLs
const processMediaUrl = (url) => {
    if (!url) return '';
    
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const baseWithoutTrailingSlash = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    return `${baseWithoutTrailingSlash}/${cleanUrl}`;
};
// Create Order
router.post('/createPaymentOrder', async (req, res) => {
    const { userId, items, address, phone, totalAmount, email } = req.body;

    console.log("=== CREATE RAZORPAY ORDER REQUEST ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    try {
        // Validation
        if (!userId || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "User ID and items are required"
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

        // Email validation
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Valid email address is required"
            });
        }

        // Prepare phone number
        let formattedPhone = phone.toString().trim();
        formattedPhone = formattedPhone.replace(/^\+91/, '').replace(/^91/, '');
        if (!/^\d{10}$/.test(formattedPhone)) {
            return res.status(400).json({
                success: false,
                message: "Phone number must be exactly 10 digits"
            });
        }
        formattedPhone = `+91${formattedPhone}`;

        // Check Razorpay credentials
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            console.error("Razorpay credentials missing");
            return res.status(500).json({
                success: false,
                message: "Payment gateway configuration error"
            });
        }

        // Calculate amount
        const amountInPaise = Math.round(totalAmount * 100);
        
        // Create Razorpay Order
        const razorpayOrderData = {
            amount: amountInPaise,
            currency: "INR",
            receipt: `order_${Date.now()}_${userId.toString().slice(-6)}`,
            notes: {
                userId: userId.toString(),
                phone: formattedPhone,
                email: email,
                address: address,
                itemsCount: items.length.toString(),
                amount: totalAmount.toString()
            }
        };

        console.log("Creating Razorpay order with data:", razorpayOrderData);

        let razorpayOrder;
        try {
            razorpayOrder = await razorpayInstance.orders.create(razorpayOrderData);
            console.log("Razorpay order created:", razorpayOrder.id);
        } catch (razorpayError) {
            console.error("Razorpay error:", razorpayError.message);
            return res.status(500).json({
                success: false,
                message: "Failed to create payment order. Please try again.",
                error: razorpayError.message
            });
        }

        // ✅ NO DATABASE ENTRY HERE - Only return Razorpay order details
        
        res.status(200).json({
            success: true,
            message: "Payment order created",
            order: {
                id: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                receipt: razorpayOrder.receipt
            }
        });

    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create payment order",
            error: error.message
        });
    }
});

router.post('/verifyPayment', async (req, res) => {
    const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature,
        userId,
        items,
        address,
        phone,
        email,
        totalAmount
    } = req.body;

    console.log("=== VERIFY PAYMENT REQUEST ===");
    console.log("Payment verification data:", {
        razorpay_order_id,
        razorpay_payment_id,
        userId,
        itemsCount: items?.length,
        email: email
    });

    try {
        // Validate required fields
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Payment verification data is incomplete"
            });
        }

        if (!userId || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Order data is incomplete"
            });
        }

        // Verify payment signature
        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        console.log("Signature verification:", {
            received: razorpay_signature,
            generated: generatedSignature,
            match: generatedSignature === razorpay_signature
        });

        if (generatedSignature !== razorpay_signature) {
            console.error("❌ Signature verification failed!");
            return res.status(400).json({
                success: false,
                message: "Invalid payment signature. Payment verification failed."
            });
        }

        console.log("✅ Payment signature verified successfully");

        // Fetch payment details from Razorpay
        let paymentDetails;
        try {
            paymentDetails = await razorpayInstance.payments.fetch(razorpay_payment_id);
            console.log("Payment details from Razorpay:", {
                id: paymentDetails.id,
                status: paymentDetails.status,
                amount: paymentDetails.amount,
                method: paymentDetails.method
            });
        } catch (error) {
            console.error("Error fetching payment details:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch payment details from gateway"
            });
        }

        // Check if payment is captured
        if (paymentDetails.status !== 'captured') {
            console.error("❌ Payment not captured:", paymentDetails.status);
            return res.status(400).json({
                success: false,
                message: `Payment is ${paymentDetails.status}. Order cannot be created.`
            });
        }

        console.log("✅ Payment captured successfully");

        // Prepare user details
        let userEmail = email;
        let userName = 'Customer';
        let isGuest = false;

        if (userId.startsWith('guest_')) {
            console.log("Processing guest order");
            isGuest = true;
            userName = email.split('@')[0] || 'Customer';
        } else {
            try {
                const user = await Admin.findById(userId);
                if (user) {
                    userEmail = user.email || email;
                    userName = user.name || email.split('@')[0] || 'Customer';
                } else {
                    isGuest = true;
                    userName = email.split('@')[0] || 'Customer';
                }
            } catch (error) {
                console.error("Error fetching user:", error.message);
                isGuest = true;
            }
        }

        // Prepare phone number
        let formattedPhone = phone.toString().trim();
        formattedPhone = formattedPhone.replace(/^\+91/, '').replace(/^91/, '');
        if (!/^\d{10}$/.test(formattedPhone)) {
            return res.status(400).json({
                success: false,
                message: "Invalid phone number format"
            });
        }
        formattedPhone = `+91${formattedPhone}`;

        // Prepare items with media
        console.log("Preparing order items...");
        const itemsWithMedia = await Promise.all(items.map(async (item) => {
            let media = [];
            let productDetails = {};
            
            try {
                const product = await Product.findById(item.productId);
                if (product) {
                    media = product.media || [];
                    media = media.map(mediaItem => ({
                        ...mediaItem,
                        url: processMediaUrl(mediaItem.url)
                    }));
                    productDetails = {
                        category: product.category,
                        description: product.description
                    };
                }
            } catch (error) {
                console.error(`Error fetching product ${item.productId}:`, error.message);
            }
            
            return {
                productId: item.productId.toString(),
                name: item.name.toString().trim(),
                quantity: parseInt(item.quantity),
                price: parseFloat(item.price),
                media: media,
                ...productDetails
            };
        }));

        // Create order in database - ONLY AFTER PAYMENT VERIFICATION ✅
        console.log("Creating database order...");
        
        const orderData = {
            userId: userId,
            userEmail: userEmail,
            userName: userName,
            email: email,
            items: itemsWithMedia,
            address: address.toString().trim(),
            phone: formattedPhone,
            totalAmount: parseFloat(totalAmount),
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            isGuest: isGuest,
            paymentInfo: {
                paymentId: razorpay_payment_id,
                amount: parseFloat(totalAmount),
                status: 'captured', // ✅ Payment is captured
                method: paymentDetails.method,
                capturedAt: new Date(),
                updatedAt: new Date()
            },
            status: 'Pending', // ✅ Order status set to Pending
            createdAt: new Date()
        };

        console.log("Order data for database:", JSON.stringify(orderData, null, 2));

        let savedOrder;
        try {
            const newOrder = new Order(orderData);
            savedOrder = await newOrder.save();
            console.log("✅ Order created in database:", savedOrder._id);
        } catch (dbError) {
            console.error("Database error:", dbError);
            return res.status(500).json({
                success: false,
                message: "Failed to save order to database",
                error: dbError.message
            });
        }

        // Log success
        if (typeof logger !== 'undefined' && logger && typeof logger.info === 'function') {
            logger.info("Order created successfully", {
                orderId: savedOrder._id,
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                userId: userId,
                totalAmount: totalAmount
            });
        }

        console.log("=== ORDER CREATION SUCCESS ===");

        // Send success response
        res.status(201).json({
            success: true,
            message: "Order created successfully!",
            orderId: savedOrder._id.toString(),
            order: {
                _id: savedOrder._id,
                status: savedOrder.status,
                totalAmount: savedOrder.totalAmount,
                createdAt: savedOrder.createdAt,
                userEmail: savedOrder.userEmail,
                userName: savedOrder.userName
            }
        });

    } catch (error) {
        console.error("Error in verifyPayment:", error);
        res.status(500).json({
            success: false,
            message: "Failed to verify payment and create order",
            error: error.message
        });
    }
});
// Update Order Status
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
router.get('/paymentStatus/:razorpayOrderId', async (req, res) => {
    const { razorpayOrderId } = req.params;

    try {
        // Check in database first
        const order = await Order.findOne({ razorpayOrderId: razorpayOrderId });
        
        if (order) {
            return res.status(200).json({
                success: true,
                orderExists: true,
                order: order,
                message: "Order found in database"
            });
        }

        // Check with Razorpay
        const razorpayOrder = await razorpayInstance.orders.fetch(razorpayOrderId);
        const payments = await razorpayInstance.orders.fetchPayments(razorpayOrderId);

        res.status(200).json({
            success: true,
            orderExists: false,
            razorpayOrder: razorpayOrder,
            payments: payments,
            message: "Order not in database, but found in Razorpay"
        });

    } catch (error) {
        console.error("Error checking payment status:", error);
        res.status(500).json({
            success: false,
            message: "Failed to check payment status"
        });
    }
});
router.get('/orders/by-email/:email', async (req, res) => {
    const { email } = req.params;

    console.log("=== FETCHING ORDERS BY EMAIL ===");
    console.log("Email:", email);

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "Email is required"
        });
    }

    try {
        // Email से orders fetch करें (case insensitive search)
        const orders = await Order.find({ 
            $or: [
                { email: { $regex: new RegExp(`^${email}$`, 'i') } },
                { userEmail: { $regex: new RegExp(`^${email}$`, 'i') } }
            ]
        })
        .populate({
            path: 'items.productId',
            model: 'Product',
            select: 'name price media category description'
        })
        .sort({ createdAt: -1 })
        .lean();

        console.log(`Found ${orders.length} orders for email: ${email}`);

        // Process media URLs
        const processedOrders = orders.map(order => {
            if (order.items) {
                order.items = order.items.map(item => {
                    // If item already has media (from createOrder), use it
                    if (item.media && Array.isArray(item.media) && item.media.length > 0) {
                        // Process existing media URLs
                        item.media = item.media.map(mediaItem => ({
                            ...mediaItem,
                            url: processMediaUrl(mediaItem.url)
                        }));
                    }
                    // If populated product has media, ensure URLs are complete
                    else if (item.productId && item.productId.media && Array.isArray(item.productId.media)) {
                        item.productId.media = item.productId.media.map(mediaItem => ({
                            ...mediaItem,
                            url: processMediaUrl(mediaItem.url)
                        }));
                    }
                    return item;
                });
            }
            return order;
        });

        res.status(200).json({
            success: true,
            orders: processedOrders,
            totalCount: processedOrders.length,
            email: email
        });

    } catch (error) {
        console.error("Error fetching orders by email:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch orders by email",
            error: error.message
        });
    }
});
// Get Orders by User ID (with product population and media URL processing)
router.get('/orders/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const orders = await Order.find({ userId })
            .populate({
                path: 'items.productId',
                model: 'Product',
                select: 'name price media category description'
            })
            .sort({ createdAt: -1 })
            .lean();

        // Process media URLs to ensure they're complete
        const processedOrders = orders.map(order => {
            if (order.items) {
                order.items = order.items.map(item => {
                    // If item already has media (from createOrder), use it
                    if (item.media && Array.isArray(item.media) && item.media.length > 0) {
                        // Process existing media URLs
                        item.media = item.media.map(mediaItem => ({
                            ...mediaItem,
                            url: processMediaUrl(mediaItem.url)
                        }));
                    }
                    // If populated product has media, ensure URLs are complete
                    else if (item.productId && item.productId.media && Array.isArray(item.productId.media)) {
                        item.productId.media = item.productId.media.map(mediaItem => ({
                            ...mediaItem,
                            url: processMediaUrl(mediaItem.url)
                        }));
                    }
                    return item;
                });
            }
            return order;
        });

        res.status(200).json({
            success: true,
            orders: processedOrders,
            totalCount: processedOrders.length
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
            .populate('userId', 'name email phone')
            .populate({
                path: 'items.productId',
                model: 'Product',
                select: 'name price media category'
            })
            .sort({ createdAt: -1 })
            .lean();

        // Process media URLs
        const processedOrders = orders.map(order => {
            if (order.items) {
                order.items = order.items.map(item => {
                    if (item.media && Array.isArray(item.media) && item.media.length > 0) {
                        item.media = item.media.map(mediaItem => ({
                            ...mediaItem,
                            url: processMediaUrl(mediaItem.url)
                        }));
                    } else if (item.productId && item.productId.media && Array.isArray(item.productId.media)) {
                        item.productId.media = item.productId.media.map(mediaItem => ({
                            ...mediaItem,
                            url: processMediaUrl(mediaItem.url)
                        }));
                    }
                    return item;
                });
            }
            return order;
        });

        res.status(200).json({
            success: true,
            orders: processedOrders,
            totalCount: processedOrders.length
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
        const order = await Order.findById(orderId)
            .populate({
                path: 'items.productId',
                model: 'Product',
                select: 'name price media category description'
            })
            .lean();
            
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // Process media URLs
        if (order.items) {
            order.items = order.items.map(item => {
                if (item.media && Array.isArray(item.media) && item.media.length > 0) {
                    item.media = item.media.map(mediaItem => ({
                        ...mediaItem,
                        url: processMediaUrl(mediaItem.url)
                    }));
                } else if (item.productId && item.productId.media && Array.isArray(item.productId.media)) {
                    item.productId.media = item.productId.media.map(mediaItem => ({
                        ...mediaItem,
                        url: processMediaUrl(mediaItem.url)
                    }));
                }
                return item;
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
            refundInfo: refundInfo,
            order: order
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

// Get single order with complete details
router.get('/order/:orderId', async (req, res) => {
    const { orderId } = req.params;

    try {
        const order = await Order.findById(orderId)
            .populate({
                path: 'items.productId',
                model: 'Product',
                select: 'name price media category description'
            })
            .lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // Process media URLs
        if (order.items) {
            order.items = order.items.map(item => {
                if (item.media && Array.isArray(item.media) && item.media.length > 0) {
                    item.media = item.media.map(mediaItem => ({
                        ...mediaItem,
                        url: processMediaUrl(mediaItem.url)
                    }));
                } else if (item.productId && item.productId.media && Array.isArray(item.productId.media)) {
                    item.productId.media = item.productId.media.map(mediaItem => ({
                        ...mediaItem,
                        url: processMediaUrl(mediaItem.url)
                    }));
                }
                return item;
            });
        }

        res.status(200).json({
            success: true,
            order: order
        });

    } catch (error) {
        console.error("Error fetching order:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch order",
            error: error.message
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
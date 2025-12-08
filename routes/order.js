const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const Admin = require('../models/admin');
const Product = require('../models/product');
const { logger } = require("../utils/logger");
const Razorpay = require('razorpay');

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Helper function to process media URLs
const processMediaUrl = (url) => {
    if (!url) return '';
    
    // If already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    
    // If it's a relative path, prepend base URL
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    
    // Use environment variable or default to localhost
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const baseWithoutTrailingSlash = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    return `${baseWithoutTrailingSlash}/${cleanUrl}`;
};

// Create Order
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

        // Create Razorpay Order
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

        // Create order in database - WITH MEDIA
        console.log("Creating database order...");
        
        const itemsWithMedia = await Promise.all(items.map(async (item) => {
            let media = [];
            let productDetails = {};
            
            try {
                // Fetch product details including media
                const product = await Product.findById(item.productId);
                if (product) {
                    media = product.media || [];
                    // Process media URLs
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
                media: media, // Save media in order
                ...productDetails // Save additional product details
            };
        }));

        const orderData = {
            userId: userId,
            userEmail: user.email || '',
            userName: user.name || 'Customer',
            items: itemsWithMedia,
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

        if (typeof logger !== 'undefined' && logger && typeof logger.error === 'function') {
            logger.error("Order creation failed", {
                error: error.message,
                stack: error.stack,
                userId,
                totalAmount,
                itemsCount: items?.length
            });
        }

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
router.get('/paymentStatus/:orderId', async (req, res) => {
    const { orderId } = req.params;

    console.log("=== GET PAYMENT STATUS ===");
    console.log("Order ID:", orderId);

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
            order: order
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
const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const Admin = require('../models/admin');
const Product = require('../models/product');
const { logger } = require("../utils/logger");
const Razorpay = require('razorpay');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Debug middleware
router.use((req, res, next) => {
  console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.body) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Validate environment variables
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error("❌ Razorpay credentials not found in environment variables!");
  console.error("Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file");
  throw new Error("Payment gateway configuration error");
}

console.log("✅ Razorpay credentials loaded:", {
  keyId: "rzp_live_RsAhVxy2ldrBIl" ? `${process.env.RAZORPAY_KEY_ID.substring(0, 10)}...` : "missing",
  keySecret:"wSS6yEWqeQWqJjsYZH6VhnPZ"? "***SECRET***" : "missing"
});

// Initialize Razorpay instance with environment variables only
const razorpayInstance = new Razorpay({
  key_id: "rzp_live_RsAhVxy2ldrBIl",
  key_secret: "wSS6yEWqeQWqJjsYZH6VhnPZ",
});

// Email transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Email template function
const generateOrderEmailTemplate = (order, user) => {
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 10px; border: 1px solid #ddd;">
        <div style="display: flex; align-items: center;">
        
          <div>
            <strong>${item.name}</strong>
            ${item.category ? `<br><small>Category: ${item.category}</small>` : ''}
          </div>
        </div>
      </td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">₹${item.price.toFixed(2)}</td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - ${order._id}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f7f9fc; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 10px 0 0; opacity: 0.9; }
        .content { padding: 30px; }
        .section { margin-bottom: 25px; }
        .section-title { color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 8px; margin-bottom: 15px; font-size: 18px; font-weight: 600; }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .info-item { background: #f8f9fa; padding: 12px 15px; border-radius: 6px; border-left: 4px solid #667eea; }
        .info-label { font-weight: 600; color: #555; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-value { color: #222; font-size: 15px; margin-top: 5px; }
        .order-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .order-table th { background: #667eea; color: white; padding: 12px; text-align: left; }
        .order-table td { padding: 12px; border-bottom: 1px solid #eee; }
        .order-table tr:hover { background: #f9f9f9; }
        .total-row { background: #f0f7ff; font-weight: bold; }
        .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .status-pending { background: #fff3cd; color: #856404; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #eee; }
        .footer a { color: #667eea; text-decoration: none; }
        .footer a:hover { text-decoration: underline; }
        .order-id { font-family: monospace; background: #f1f3f4; padding: 4px 8px; border-radius: 4px; font-size: 14px; }
        .highlight { background: linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%); padding: 10px 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #4dabf7; }
        @media (max-width: 600px) {
          .content { padding: 20px; }
          .info-grid { grid-template-columns: 1fr; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Order Confirmed!</h1>
          <p>Thank you for your purchase. Your order has been received and is being processed.</p>
        </div>
        
        <div class="content">
          <div class="section">
            <div class="section-title">Order Summary</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Order ID</div>
                <div class="info-value order-id">${order._id}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Order Date</div>
                <div class="info-value">${new Date(order.createdAt).toLocaleDateString('en-IN', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Status</div>
                <div class="info-value">
                  <span class="status-badge status-pending">${order.status}</span>
                </div>
              </div>
              <div class="info-item">
                <div class="info-label">Payment</div>
                <div class="info-value">Paid via Razorpay (${order.paymentInfo?.method || 'Online'})</div>
              </div>
            </div>
          </div>

          <div class="highlight">
            <strong>📦 Delivery Address:</strong><br>
            ${order.userName || 'Customer'}<br>
            ${order.address}<br>
            📞 ${order.phone}<br>
            📧 ${order.email}
          </div>

          <div class="section">
            <div class="section-title">Order Details</div>
            <table class="order-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
                <tr class="total-row">
                  <td colspan="3" style="text-align: right; padding-right: 15px;"><strong>Total Amount:</strong></td>
                  <td style="text-align: right; font-size: 18px; color: #667eea;">
                    <strong>₹${order.totalAmount.toFixed(2)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Next Steps</div>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Your order is being processed and will be shipped soon.</li>
              <li>You will receive shipping confirmation once your order is dispatched.</li>
              <li>For any queries, reply to this email or contact our support team.</li>
              <li>You can track your order status from your account dashboard.</li>
            </ul>
          </div>

          <div style="text-align: center; margin-top: 30px; padding: 15px; background: #f0f7ff; border-radius: 8px;">
            <strong>Need Help?</strong><br>
            Contact our customer support at 
            <a href="mailto:ukgermanpharmaceutical@gmail.com">support@Drbsk.com</a> 
            or call us at <strong>+91-9115513759</strong>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for shopping with us! 🛍️</p>
          <p>
            <a href="${process.env.STORE_URL || 'https://yourstore.com'}">Visit Our Store</a>
          </p>
          <p style="margin-top: 15px; font-size: 12px; color: #888;">
            This is an automated email. Please do not reply directly to this message.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Function to send order confirmation email
const sendOrderConfirmationEmail = async (order, userEmail, userName) => {
  try {
    const mailOptions = {
      from: {
        name: process.env.STORE_NAME || 'Your Store',
        address: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@yourstore.com'
      },
      to: userEmail,
      subject: `Order Confirmation #${order._id} - ${process.env.STORE_NAME || 'Your Store'}`,
      html: generateOrderEmailTemplate(order, { email: userEmail, name: userName }),
      text: `
Order Confirmation #${order._id}

Dear ${userName || 'Customer'},

Thank you for your order! We have received your order and it is being processed.

ORDER DETAILS:
Order ID: ${order._id}
Order Date: ${new Date(order.createdAt).toLocaleString()}
Status: ${order.status}
Total Amount: ₹${order.totalAmount.toFixed(2)}

SHIPPING ADDRESS:
${userName || 'Customer'}
${order.address}
Phone: ${order.phone}
Email: ${userEmail}

ORDER ITEMS:
${order.items.map(item => `- ${item.name} x ${item.quantity}: ₹${item.price.toFixed(2)} each`).join('\n')}

Total: ₹${order.totalAmount.toFixed(2)}

Your order will be shipped soon. You will receive another email with tracking information once your order is dispatched.

For any questions, please contact our customer support.

Thank you for shopping with us!

Best regards,
${process.env.STORE_NAME || 'Your Store Team'}
${process.env.STORE_URL || 'https://yourstore.com'}
      `
    };

    console.log(`Sending order confirmation email to: ${userEmail}`);
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Order confirmation email sent: ${info.messageId}`);
    
    return {
      success: true,
      messageId: info.messageId,
      email: userEmail
    };
  } catch (error) {
    console.error('❌ Error sending order confirmation email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to process media URLs
const processMediaUrl = (url) => {
  if (!url) return '';
  
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  
  const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
  const baseUrl = "https://drbskhealthcare.com";
  const baseWithoutTrailingSlash = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  return `${baseWithoutTrailingSlash}/${cleanUrl}`;
};

// Get orders by email
router.get('/orders/email/:email', async (req, res) => {
  const { email } = req.params;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required"
    });
  }

  try {
    // Case-insensitive search for email
    const emailRegex = new RegExp(`^${email}$`, 'i');
    
    const orders = await Order.find({ 
      $or: [
        { email: emailRegex },
        { userEmail: emailRegex }
      ]
    })
    .populate({
      path: 'items.productId',
      model: 'Product',
      select: 'name price media category description'
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
    console.error("Error fetching orders by email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders by email",
      error: error.message
    });
  }
});

// Guest orders को linked करने का API
router.post('/link-guest-orders', async (req, res) => {
  const { email, userId } = req.body;

  try {
    const guestOrders = await Order.find({
      $or: [
        { email: { $regex: new RegExp(`^${email}$`, 'i') } },
        { userEmail: { $regex: new RegExp(`^${email}$`, 'i') } }
      ],
      userId: { $exists: false }
    });

    if (guestOrders.length === 0) {
      return res.json({
        success: true,
        message: 'No guest orders found to link',
        linkedCount: 0
      });
    }

    const result = await Order.updateMany(
      { _id: { $in: guestOrders.map(order => order._id) } },
      { $set: { userId: userId, isGuest: false } }
    );

    res.json({
      success: true,
      message: `Linked ${result.modifiedCount} guest orders to your account`,
      linkedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error linking guest orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to link guest orders'
    });
  }
});

// Guest orders को logged-in user से link करने का API
router.post('/orders/link-guest-orders', async (req, res) => {
  const { email, userId } = req.body;

  console.log("=== LINKING GUEST ORDERS ===");
  console.log("Email:", email);
  console.log("User ID:", userId);

  if (!email || !userId) {
    return res.status(400).json({
      success: false,
      message: "Email and userId are required"
    });
  }

  try {
    const guestOrders = await Order.find({
      $or: [
        { email: { $regex: new RegExp(`^${email}$`, 'i') } },
        { userEmail: { $regex: new RegExp(`^${email}$`, 'i') } }
      ],
      $or: [
        { userId: { $exists: false } },
        { userId: /^guest_/ },
        { isGuest: true }
      ]
    });

    console.log(`Found ${guestOrders.length} guest orders to link`);

    if (guestOrders.length === 0) {
      return res.json({
        success: true,
        message: 'No guest orders found to link',
        linkedCount: 0
      });
    }

    const result = await Order.updateMany(
      { _id: { $in: guestOrders.map(order => order._id) } },
      { $set: { userId: userId, isGuest: false } }
    );

    console.log(`Linked ${result.modifiedCount} guest orders`);

    res.json({
      success: true,
      message: `Linked ${result.modifiedCount} guest orders to your account`,
      linkedCount: result.modifiedCount,
      orders: guestOrders.map(order => ({
        orderId: order._id,
        createdAt: order.createdAt,
        totalAmount: order.totalAmount
      }))
    });

  } catch (error) {
    console.error('Error linking guest orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to link guest orders',
      error: error.message
    });
  }
});

// Create Razorpay Order
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
    
    console.log("Phone validation:", {
      original: phone,
      cleaned: formattedPhone,
      length: formattedPhone.length,
      is10Digits: /^\d{10}$/.test(formattedPhone)
    });
    
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
      console.log("✅ Razorpay order created:", razorpayOrder.id);
    } catch (razorpayError) {
      console.error("❌ Razorpay error:", razorpayError.message);
      console.error("Razorpay error details:", razorpayError.error);
      return res.status(500).json({
        success: false,
        message: "Failed to create payment order. Please try again.",
        error: razorpayError.message
      });
    }

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
    console.error("❌ Error creating Razorpay order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment order",
      error: error.message
    });
  }
});

// Verify Payment and Create Order with Email
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
      .createHmac('sha256', 'wSS6yEWqeQWqJjsYZH6VhnPZ')
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

    console.log("✅ Payment paid successfully");

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
        status: 'captured',
        method: paymentDetails.method,
        capturedAt: new Date(),
        updatedAt: new Date()
      },
      status: 'Pending',
      emailSent: false,
      emailError: null,
      createdAt: new Date()
    };

    console.log("Order data for database:", JSON.stringify(orderData, null, 2));

    let savedOrder;
    try {
      const newOrder = new Order(orderData);
      savedOrder = await newOrder.save();
      console.log("✅ Order created in database:", savedOrder._id);
      
      // ✅ SEND EMAIL HERE - After order is successfully saved
      try {
        console.log("Sending order confirmation email...");
        const emailResult = await sendOrderConfirmationEmail(
          savedOrder.toObject(), 
          userEmail, 
          userName
        );
        
        if (emailResult.success) {
          console.log(`✅ Order confirmation email sent to ${userEmail}`);
          savedOrder.emailSent = true;
          savedOrder.emailSentAt = new Date();
          savedOrder.emailError = null;
          await savedOrder.save();
        } else {
          console.log(`⚠️ Email sending failed: ${emailResult.error}`);
          savedOrder.emailSent = false;
          savedOrder.emailError = emailResult.error;
          await savedOrder.save();
        }
      } catch (emailError) {
        console.error("Error in email sending:", emailError);
        savedOrder.emailSent = false;
        savedOrder.emailError = emailError.message;
        await savedOrder.save();
      }
      
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
        totalAmount: totalAmount,
        emailSent: savedOrder.emailSent || false
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
        userName: savedOrder.userName,
        emailSent: savedOrder.emailSent || false
      }
    });

  } catch (error) {
    console.error("❌ Error in verifyPayment:", error);
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
              amount: Math.round(order.totalAmount * 100),
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

          if (logger && typeof logger.info === 'function') {
            logger.info("Refund initiated successfully", {
              orderId: order._id,
              refundId: refund.id,
              amount: refund.amount / 100,
              paymentId: order.paymentInfo.paymentId
            });
          }

        } catch (refundError) {
          console.error("Refund API failed:");
          console.error("Error:", refundError.message);
          console.error("Code:", refundError.error?.code);

          if (logger && typeof logger.error === 'function') {
            logger.error("Refund processing failed", {
              orderId,
              paymentId: order.paymentInfo.paymentId,
              error: refundError.message,
              errorCode: refundError.error?.code
            });
          }

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
    if (logger && typeof logger.error === 'function') {
      logger.error("Error updating order status", {
        orderId,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: error.message
    });
  }
});

// Add endpoint to resend order confirmation email
router.post('/orders/:orderId/resend-email', async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const emailResult = await sendOrderConfirmationEmail(
      order.toObject(),
      order.userEmail || order.email,
      order.userName || 'Customer'
    );

    if (emailResult.success) {
      order.emailSent = true;
      order.emailSentAt = new Date();
      order.emailError = null;
      await order.save();

      res.status(200).json({
        success: true,
        message: "Order confirmation email resent successfully",
        email: order.userEmail || order.email,
        messageId: emailResult.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to resend email",
        error: emailResult.error
      });
    }

  } catch (error) {
    console.error("Error resending email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend order confirmation email",
      error: error.message
    });
  }
});

// Get Payment Status
router.get('/paymentStatus/:razorpayOrderId', async (req, res) => {
  const { razorpayOrderId } = req.params;

  try {
    const order = await Order.findOne({ razorpayOrderId: razorpayOrderId });
    
    if (order) {
      return res.status(200).json({
        success: true,
        orderExists: true,
        order: order,
        message: "Order found in database"
      });
    }

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

// Get Orders by Email
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

    const processedOrders = orders.map(order => {
      if (order.items) {
        order.items = order.items.map(item => {
          if (item.media && Array.isArray(item.media) && item.media.length > 0) {
            item.media = item.media.map(mediaItem => ({
              ...mediaItem,
              url: processMediaUrl(mediaItem.url)
            }));
          }
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

// Get Orders by User ID
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

    const processedOrders = orders.map(order => {
      if (order.items) {
        order.items = order.items.map(item => {
          if (item.media && Array.isArray(item.media) && item.media.length > 0) {
            item.media = item.media.map(mediaItem => ({
              ...mediaItem,
              url: processMediaUrl(mediaItem.url)
            }));
          }
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
// In your backend route
// routes/product.routes.js
router.get('/productsBySubcategory', async (req, res) => {
  const requestStartTime = Date.now();

  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📥 /productsBySubcategory API HIT");
    console.log("🕒 Time:", new Date().toISOString());
    console.log("🌐 Full URL:", req.originalUrl);
    console.log("📦 Raw Query Params:", req.query);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    let { subcategory } = req.query;

    /* ===============================
       1️⃣ VALIDATION
    =============================== */
    if (!subcategory) {
      console.error("❌ ERROR: subcategory is missing in query");
      return res.status(400).json({ error: "subcategory is required" });
    }

    console.log("✅ Subcategory received (raw):", `"${subcategory}"`);
    console.log("📏 Raw length:", subcategory.length);

    /* ===============================
       2️⃣ DECODING STEP
    =============================== */
    const decodedSubcategory = decodeURIComponent(subcategory);
    console.log("🔓 Decoded subcategory:", `"${decodedSubcategory}"`);

    /* ===============================
       3️⃣ NORMALIZATION STEP
    =============================== */
    const normalizedSubcategory = decodedSubcategory
      .replace(/%20/g, " ")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

    console.log("🧹 Normalized subcategory:", `"${normalizedSubcategory}"`);
    console.log("📏 Normalized length:", normalizedSubcategory.length);

    /* ===============================
       4️⃣ REGEX CREATION
    =============================== */
    const regex = new RegExp(`^${normalizedSubcategory}$`, "i");
    console.log("🧪 Generated Regex:", regex);

    /* ===============================
       5️⃣ DATABASE QUERY START
    =============================== */
    console.log("🗄️ Querying Product collection...");
    console.time("⏱️ MongoDB Query Time");

    const products = await Product.find({
      sub_category: { $regex: regex }
    });

    console.timeEnd("⏱️ MongoDB Query Time");

    /* ===============================
       6️⃣ QUERY RESULT LOGS
    =============================== */
    console.log("📊 Products found count:", products.length);

    if (products.length === 0) {
      console.warn("⚠️ No products matched subcategory:", `"${normalizedSubcategory}"`);
    } else {
      console.log("🧾 Matched Product IDs:", products.map(p => p._id));
      console.log("🧾 Matched Subcategories:", [
        ...new Set(products.map(p => p.sub_category))
      ]);
    }

    /* ===============================
       7️⃣ RESPONSE SENT
    =============================== */
    const totalTime = Date.now() - requestStartTime;
    console.log("✅ Response sent successfully");
    console.log("⏱️ Total API Time:", `${totalTime} ms`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    res.status(200).json(products);

  } catch (error) {
    console.error("🔥 SERVER ERROR OCCURRED");
    console.error("🧨 Error Message:", error.message);
    console.error("📛 Error Stack:", error.stack);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    res.status(500).json({ error: "Server error" });
  }
});




// Test route with Razorpay key info
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: "Order routes working!",
    timestamp: new Date().toISOString(),
    razorpayKey: process.env.RAZORPAY_KEY_ID ? `${process.env.RAZORPAY_KEY_ID.substring(0, 10)}...` : 'not set',
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
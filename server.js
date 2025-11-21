// server.js - Razorpay Payment Backend
const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Initialize Razorpay with your keys
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// API: Create Order
app.post('/api/create-order', async (req, res) => {
    try {
        const { amount, upiId } = req.body;

        // Validate
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid amount' });
        }

        // Create Razorpay order (amount in paise)
        const options = {
            amount: Math.round(amount * 100), // Convert to paise
            currency: 'INR',
            receipt: 'receipt_' + Date.now(),
            notes: { upi_id: upiId }
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error('Order Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API: Verify Payment
app.post('/api/verify-payment', (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Create signature to verify
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Payment verified - save to database here if needed
            res.json({
                success: true,
                message: 'Payment verified successfully',
                payment_id: razorpay_payment_id
            });
        } else {
            res.status(400).json({ success: false, message: 'Invalid signature' });
        }

    } catch (error) {
        console.error('Verify Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n✅ Server running at: http://localhost:${PORT}`);
    console.log(`🔑 Razorpay Key: ${process.env.RAZORPAY_KEY_ID ? 'Loaded' : 'MISSING!'}`);
    console.log(`\n📱 Open http://localhost:${PORT} in Chrome\n`);
});
// =============================================
// API ROUTES FOR XENO CRM
// =============================================

// =============================================
// 1. CUSTOMER ROUTES
// src/routes/customers.js
// =============================================

const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Order = require('../models/Order');

// GET /api/customers - Get all customers with filtering
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, ...filters } = req.query;
    
    // Build MongoDB query from filters
    const query = {};
    if (filters.min_spend) query.total_spend = { $gte: parseInt(filters.min_spend) };
    if (filters.max_spend) query.total_spend = { ...query.total_spend, $lte: parseInt(filters.max_spend) };
    if (filters.min_visits) query.visit_count = { $gte: parseInt(filters.min_visits) };
    
    const customers = await Customer.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ created_at: -1 });
    
    const total = await Customer.countDocuments(query);
    
    res.json({
      success: true,
      data: customers,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_records: total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/customers - Create new customer
router.post('/', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    
    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res.status(400).json({ 
        success: false, 
        error: 'Customer with this email already exists' 
      });
    }
    
    const customer = new Customer({ name, email, phone });
    await customer.save();
    
    res.status(201).json({
      success: true,
      data: customer,
      message: 'Customer created successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        error: 'Customer with this email already exists' 
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/customers/preview - Preview audience size
router.post('/preview', async (req, res) => {
  try {
    const { query } = req.body;
    
    // Convert query to handle date fields properly
    const mongoQuery = { ...query };
    
    // Handle last_visit_days (virtual field) - convert to actual last_visit query
    if (mongoQuery.last_visit_days) {
      const daysAgo = mongoQuery.last_visit_days;
      const dateThreshold = new Date(Date.now() - daysAgo.$gt * 24 * 60 * 60 * 1000);
      mongoQuery.last_visit = { $lt: dateThreshold };
      delete mongoQuery.last_visit_days;
    }
    
    const count = await Customer.countDocuments(mongoQuery);
    
    res.json({
      success: true,
      count,
      query: mongoQuery
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/customers/bulk - Bulk insert customers (for testing)
router.post('/bulk', async (req, res) => {
  try {
    const { customers } = req.body;
    
    if (!Array.isArray(customers)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Expected array of customers' 
      });
    }
    
    const result = await Customer.insertMany(customers, { ordered: false });
    
    res.json({
      success: true,
      inserted: result.length,
      message: `${result.length} customers created successfully`
    });
  } catch (error) {
    // Handle duplicate key errors gracefully
    if (error.code === 11000) {
      const inserted = error.result?.nInserted || 0;
      return res.json({
        success: true,
        inserted,
        message: `${inserted} customers created (some duplicates skipped)`
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

// =============================================
// 2. ORDER ROUTES
// src/routes/orders.js
// =============================================

const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Customer = require('../models/Customer');

// GET /api/orders - Get all orders
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, customer_id } = req.query;
    
    const query = customer_id ? { customer_id } : {};
    
    const orders = await Order.find(query)
      .populate('customer_id', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ order_date: -1 });
    
    const total = await Order.countDocuments(query);
    
    res.json({
      success: true,
      data: orders,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_records: total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/orders - Create new order
router.post('/', async (req, res) => {
  try {
    const { customer_id, amount, order_date, status } = req.body;
    
    // Verify customer exists
    const customer = await Customer.findById(customer_id);
    if (!customer) {
      return res.status(400).json({ 
        success: false, 
        error: 'Customer not found' 
      });
    }
    
    const order = new Order({
      customer_id,
      amount,
      order_date: order_date ? new Date(order_date) : new Date(),
      status: status || 'completed'
    });
    
    await order.save();
    
    // Update customer stats
    await updateCustomerStats(customer_id);
    
    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/orders/bulk - Bulk insert orders (for testing)
router.post('/bulk', async (req, res) => {
  try {
    const { orders } = req.body;
    
    if (!Array.isArray(orders)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Expected array of orders' 
      });
    }
    
    const result = await Order.insertMany(orders);
    
    // Update customer stats for all affected customers
    const customerIds = [...new Set(orders.map(o => o.customer_id))];
    await Promise.all(customerIds.map(updateCustomerStats));
    
    res.json({
      success: true,
      inserted: result.length,
      message: `${result.length} orders created successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to update customer statistics
async function updateCustomerStats(customerId) {
  try {
    const orders = await Order.find({ customer_id: customerId });
    
    const total_spend = orders.reduce((sum, order) => sum + order.amount, 0);
    const visit_count = orders.length;
    const last_visit = orders.length > 0 
      ? new Date(Math.max(...orders.map(o => new Date(o.order_date)))) 
      : new Date();
    
    await Customer.findByIdAndUpdate(customerId, {
      total_spend,
      visit_count,
      last_visit
    });
  } catch (error) {
    console.error('Error updating customer stats:', error);
  }
}

module.exports = router;

// =============================================
// 3. CAMPAIGN ROUTES
// src/routes/campaigns.js
// =============================================

const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const CommunicationLog = require('../models/CommunicationLog');
const Customer = require('../models/Customer');
const AIService = require('../services/aiService');
const axios = require('axios');

// GET /api/campaigns - Get all campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/campaigns - Create new campaign
router.post('/', async (req, res) => {
  try {
    const { name, rules, message, created_by } = req.body;
    
    // Get audience based on rules
    const customers = await Customer.find(rules);
    
    if (customers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No customers match the specified rules'
      });
    }
    
    // Create campaign
    const campaign = new Campaign({
      name: name || `Campaign ${Date.now()}`,
      rules,
      message: message || "Hi {name}, here's a special offer for you!",
      created_by: created_by || 'system',
      audience_size: customers.length,
      stats: {
        total: customers.length,
        sent: 0,
        failed: 0
      }
    });
    
    await campaign.save();
    
    // Create communication logs for each customer
    const communicationLogs = customers.map(customer => ({
      campaign_id: campaign._id,
      customer_id: customer._id,
      message: campaign.message.replace('{name}', customer.name),
      status: 'PENDING'
    }));
    
    await CommunicationLog.insertMany(communicationLogs);
    
    // Start campaign delivery (async)
    deliverCampaign(campaign._id).catch(console.error);
    
    res.status(201).json({
      success: true,
      data: campaign,
      message: 'Campaign created and delivery started'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/campaigns/:id - Get specific campaign with logs
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    
    const logs = await CommunicationLog.find({ campaign_id: req.params.id })
      .populate('customer_id', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: {
        campaign,
        logs
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Function to deliver campaign messages
async function deliverCampaign(campaignId) {
  try {
    const logs = await CommunicationLog.find({ 
      campaign_id: campaignId, 
      status: 'PENDING' 
    }).populate('customer_id');
    
    console.log(`📤 Delivering campaign ${campaignId} to ${logs.length} customers`);
    
    for (const log of logs) {
      try {
        // Call vendor API (simulated)
        const vendorResponse = await axios.post('http://localhost:3000/api/vendor/send-message', {
          message_id: log._id,
          customer_email: log.customer_id.email,
          customer_name: log.customer_id.name,
          message: log.message
        }, { timeout: 5000 });
        
        // Update log status
        await CommunicationLog.findByIdAndUpdate(log._id, {
          status: 'SENT',
          sent_at: new Date()
        });
        
      } catch (error) {
        // Mark as failed
        await CommunicationLog.findByIdAndUpdate(log._id, {
          status: 'FAILED',
          delivery_receipt: { error: error.message }
        });
      }
      
      // Add delay between messages (rate limiting)
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Update campaign stats
    await updateCampaignStats(campaignId);
    
  } catch (error) {
    console.error('Campaign delivery error:', error);
  }
}

// Update campaign statistics
async function updateCampaignStats(campaignId) {
  try {
    const stats = await CommunicationLog.aggregate([
      { $match: { campaign_id: campaignId } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }}
    ]);
    
    const statsObj = {
      total: 0,
      sent: 0,
      failed: 0
    };
    
    stats.forEach(stat => {
      if (stat._id === 'SENT') statsObj.sent = stat.count;
      else if (stat._id === 'FAILED') statsObj.failed = stat.count;
      statsObj.total += stat.count;
    });
    
    await Campaign.findByIdAndUpdate(campaignId, {
      stats: statsObj,
      status: statsObj.sent + statsObj.failed === statsObj.total ? 'completed' : 'active'
    });
    
  } catch (error) {
    console.error('Error updating campaign stats:', error);
  }
}

module.exports = router;

// =============================================
// 4. AI ROUTES
// src/routes/ai.js
// =============================================

const express = require('express');
const router = express.Router();
const AIService = require('../services/aiService');

// POST /api/ai/natural-to-rules - Convert natural language to MongoDB rules
router.post('/natural-to-rules', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Query string is required' 
      });
    }
    
    const mongoQuery = await AIService.convertToMongoQuery(query);
    
    res.json({
      success: true,
      original_query: query,
      mongo_query: mongoQuery,
      message: 'Query converted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/generate-messages - Generate campaign messages
router.post('/generate-messages', async (req, res) => {
  try {
    const { objective, audience } = req.body;
    
    if (!objective) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campaign objective is required' 
      });
    }
    
    const messages = await AIService.generateCampaignMessages(
      objective, 
      audience || 'general audience'
    );
    
    res.json({
      success: true,
      messages,
      message: 'Messages generated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/campaign-summary - Generate campaign performance summary
router.post('/campaign-summary', async (req, res) => {
  try {
    const { stats } = req.body;
    
    if (!stats || typeof stats !== 'object') {
      return res.status(400).json({ 
        success: false, 
        error: 'Campaign stats object is required' 
      });
    }
    
    const summary = await AIService.generateCampaignSummary(stats);
    
    res.json({
      success: true,
      summary,
      message: 'Campaign summary generated successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

// =============================================
// 5. VENDOR API (Mock External Service)
// src/routes/vendor.js
// =============================================

const express = require('express');
const router = express.Router();
const axios = require('axios');

// POST /api/vendor/send-message - Mock vendor API that simulates message delivery
router.post('/send-message', async (req, res) => {
  try {
    const { message_id, customer_email, customer_name, message } = req.body;
    
    console.log(`📨 Vendor API: Sending message to ${customer_name} (${customer_email})`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    
    // Simulate 90% success rate
    const success = Math.random() > 0.1;
    const status = success ? 'SENT' : 'FAILED';
    
    // Send delivery receipt back to our API
    setTimeout(async () => {
      try {
        await axios.post('http://localhost:3000/api/vendor/delivery-receipt', {
          message_id,
          status,
          timestamp: new Date().toISOString(),
          vendor_response: success 
            ? { delivery_id: `del_${Date.now()}`, provider: 'MockVendor' }
            : { error: 'Network timeout', error_code: 'TIMEOUT' }
        });
      } catch (error) {
        console.error('Failed to send delivery receipt:', error.message);
      }
    }, Math.random() * 2000 + 1000); // Random delay 1-3 seconds
    
    res.json({
      success: true,
      message_id,
      status: 'ACCEPTED', // Vendor accepts the message for delivery
      estimated_delivery: '1-3 seconds'
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/vendor/delivery-receipt - Receive delivery receipts from vendor
router.post('/delivery-receipt', async (req, res) => {
  try {
    const { message_id, status, timestamp, vendor_response } = req.body;
    
    console.log(`📬 Delivery receipt: ${message_id} -> ${status}`);
    
    // Update communication log
    const CommunicationLog = require('../models/CommunicationLog');
    const Campaign = require('../models/Campaign');
    
    const log = await CommunicationLog.findByIdAndUpdate(message_id, {
      status,
      sent_at: timestamp ? new Date(timestamp) : new Date(),
      delivery_receipt: vendor_response
    }, { new: true });
    
    if (log) {
      // Update campaign stats
      await updateCampaignStats(log.campaign_id);
    }
    
    res.json({ success: true, message: 'Receipt processed' });
    
  } catch (error) {
    console.error('Delivery receipt error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to update campaign statistics
async function updateCampaignStats(campaignId) {
  try {
    const CommunicationLog = require('../models/CommunicationLog');
    const Campaign = require('../models/Campaign');
    
    const stats = await CommunicationLog.aggregate([
      { $match: { campaign_id: campaignId } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }}
    ]);
    
    const statsObj = {
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0
    };
    
    stats.forEach(stat => {
      if (stat._id === 'SENT') statsObj.sent = stat.count;
      else if (stat._id === 'FAILED') statsObj.failed = stat.count;
      else if (stat._id === 'PENDING') statsObj.pending = stat.count;
      statsObj.total += stat.count;
    });
    
    const isCompleted = statsObj.pending === 0 && statsObj.total > 0;
    
    await Campaign.findByIdAndUpdate(campaignId, {
      stats: statsObj,
      status: isCompleted ? 'completed' : 'active'
    });
    
  } catch (error) {
    console.error('Error updating campaign stats:', error);
  }
}

module.exports = router;

// =============================================
// 6. AUTH ROUTES (Simplified - for Google OAuth later)
// src/routes/auth.js
// =============================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// POST /api/auth/login - Simple login (we'll add Google OAuth later)
router.post('/login', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }
    
    // For now, accept any email (we'll add Google OAuth later)
    const token = jwt.sign(
      { email, name: name || 'User' }, 
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token,
      user: { email, name: name || 'User' },
      message: 'Login successful'
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

module.exports = router;

// =============================================
// 7. MIDDLEWARE (Optional - for protected routes)
// src/middleware/auth.js
// =============================================

const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken };

// =============================================
// 8. SAMPLE DATA GENERATOR (For Testing)
// scripts/generateSampleData.js
// =============================================

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/xeno-crm');

const Customer = require('../src/models/Customer');
const Order = require('../src/models/Order');

async function generateSampleData() {
  try {
    console.log('🔄 Generating sample data...');
    
    // Clear existing data
    await Customer.deleteMany({});
    await Order.deleteMany({});
    
    // Generate 100 sample customers
    const customers = [];
    const names = ['Rajesh', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anita', 'Rohit', 'Kavya', 'Arjun', 'Meera'];
    
    for (let i = 1; i <= 100; i++) {
      const randomName = names[Math.floor(Math.random() * names.length)];
      customers.push({
        name: `${randomName} ${i}`,
        email: `customer${i}@example.com`,
        phone: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        total_spend: 0,
        visit_count: 0,
        last_visit: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000) // Random date in last year
      });
    }
    
    const savedCustomers = await Customer.insertMany(customers);
    console.log(`✅ Created ${savedCustomers.length} customers`);
    
    // Generate random orders for customers
    const orders = [];
    for (const customer of savedCustomers) {
      const numOrders = Math.floor(Math.random() * 10) + 1; // 1-10 orders per customer
      
      for (let j = 0; j < numOrders; j++) {
        orders.push({
          customer_id: customer._id,
          amount: Math.floor(Math.random() * 10000) + 500, // ₹500 to ₹10,500
          order_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
          status: Math.random() > 0.1 ? 'completed' : 'cancelled'
        });
      }
    }
    
    const savedOrders = await Order.insertMany(orders);
    console.log(`✅ Created ${savedOrders.length} orders`);
    
    // Update customer statistics
    console.log('🔄 Updating customer statistics...');
    for (const customer of savedCustomers) {
      const customerOrders = savedOrders.filter(o => 
        o.customer_id.toString() === customer._id.toString() && o.status === 'completed'
      );
      
      const total_spend = customerOrders.reduce((sum, order) => sum + order.amount, 0);
      const visit_count = customerOrders.length;
      const last_visit = customerOrders.length > 0 
        ? new Date(Math.max(...customerOrders.map(o => new Date(o.order_date)))) 
        : customer.last_visit;
      
      await Customer.findByIdAndUpdate(customer._id, {
        total_spend,
        visit_count,
        last_visit
      });
    }
    
    console.log('✅ Sample data generation complete!');
    console.log('📊 Summary:');
    console.log(`   - Customers: ${savedCustomers.length}`);
    console.log(`   - Orders: ${savedOrders.length}`);
    console.log(`   - Total Revenue: ₹${orders.reduce((sum, o) => sum + o.amount, 0).toLocaleString()}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error generating sample data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateSampleData();
}

module.exports = { generateSampleData };
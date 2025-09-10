const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Customer model (inline for now)
const Customer = mongoose.model('Customer', {
  name: String,
  email: String,
  phone: String,
  total_spend: { type: Number, default: 0 },
  visit_count: { type: Number, default: 0 },
  last_visit: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now }
});

// GET /api/customers - Get all customers
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const customers = await Customer.find()
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ created_at: -1 });
    
    const total = await Customer.countDocuments();
    
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

module.exports = router;
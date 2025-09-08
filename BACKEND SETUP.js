// =============================================
// COMPLETE BACKEND SETUP FOR XENO CRM
// =============================================

// 1. PACKAGE.JSON
// Create this first with: npm init -y
// Then install dependencies with: npm install express mongoose cors dotenv bcryptjs jsonwebtoken axios helmet morgan

{
  "name": "xeno-crm-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.5.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "axios": "^1.5.0",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}

// =============================================
// 2. SERVER.JS (Main Entry Point)
// =============================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/customers', require('./src/routes/customers'));
app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/campaigns', require('./src/routes/campaigns'));
app.use('/api/ai', require('./src/routes/ai'));
app.use('/api/vendor', require('./src/routes/vendor'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/xeno-crm', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
});

// =============================================
// 3. ENVIRONMENT VARIABLES (.env file)
// =============================================

/*
Create a .env file in your root directory with:

PORT=3000
MONGODB_URI=mongodb://localhost:27017/xeno-crm
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
HUGGING_FACE_API_KEY=hf_your_token_here
FRONTEND_URL=http://localhost:3001
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
*/

// =============================================
// 4. DATABASE MODELS
// =============================================

// src/models/Customer.js
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  total_spend: {
    type: Number,
    default: 0
  },
  visit_count: {
    type: Number,
    default: 0
  },
  last_visit: {
    type: Date,
    default: Date.now
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Virtual field for days since last visit
customerSchema.virtual('last_visit_days').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.last_visit);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

module.exports = mongoose.model('Customer', customerSchema);

// =============================================
// src/models/Order.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  order_date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);

// =============================================
// src/models/Campaign.js
const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  rules: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  created_by: {
    type: String, // Will store user email for now
    required: true
  },
  audience_size: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'failed'],
    default: 'active'
  },
  stats: {
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Campaign', campaignSchema);

// =============================================
// src/models/CommunicationLog.js
const mongoose = require('mongoose');

const communicationLogSchema = new mongoose.Schema({
  campaign_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'FAILED'],
    default: 'PENDING'
  },
  sent_at: {
    type: Date
  },
  delivery_receipt: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CommunicationLog', communicationLogSchema);

// =============================================
// 5. AI SERVICE (Hugging Face Integration)
// =============================================

// src/services/aiService.js
const axios = require('axios');

class AIService {
  constructor() {
    this.hfApiKey = process.env.HUGGING_FACE_API_KEY;
    this.baseUrl = 'https://api-inference.huggingface.co/models/';
  }

  async convertToMongoQuery(naturalLanguage) {
    const prompt = `Convert this natural language to MongoDB query JSON.
    
Examples:
- "customers who spent over 5000" → {"total_spend": {"$gt": 5000}}
- "people who haven't visited in 30 days" → {"last_visit": {"$lt": "DATE_30_DAYS_AGO"}}
- "customers with less than 3 visits" → {"visit_count": {"$lt": 3}}

Convert: "${naturalLanguage}"

MongoDB Query (JSON only):`;

    try {
      const response = await this.callHuggingFace('google/flan-t5-large', prompt);
      return this.parseMongoQuery(response, naturalLanguage);
    } catch (error) {
      console.error('AI conversion error:', error);
      return this.fallbackQuery(naturalLanguage);
    }
  }

  async generateCampaignMessages(objective, audienceDescription) {
    const prompt = `Create 3 marketing messages for a campaign.
    
Objective: ${objective}
Audience: ${audienceDescription}

Requirements:
- Personalized (use {name} placeholder)
- Include discount/offer
- Keep under 100 characters
- Professional tone

Messages:`;

    try {
      const response = await this.callHuggingFace('microsoft/DialoGPT-medium', prompt);
      return this.parseMessages(response);
    } catch (error) {
      console.error('Message generation error:', error);
      return this.fallbackMessages();
    }
  }

  async generateCampaignSummary(stats) {
    const deliveryRate = ((stats.sent / stats.total) * 100).toFixed(1);
    
    const prompt = `Summarize this campaign performance in 2-3 sentences:

Campaign Results:
- Total messages: ${stats.total}
- Successfully delivered: ${stats.sent}
- Failed: ${stats.failed}
- Delivery rate: ${deliveryRate}%

Write a business-friendly summary:`;

    try {
      const response = await this.callHuggingFace('facebook/bart-large-cnn', prompt);
      return response.trim() || this.fallbackSummary(stats);
    } catch (error) {
      return this.fallbackSummary(stats);
    }
  }

  async callHuggingFace(model, prompt) {
    const response = await axios.post(`${this.baseUrl}${model}`, 
      {
        inputs: prompt,
        parameters: {
          max_length: 200,
          temperature: 0.7,
          do_sample: true
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.hfApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    return response.data[0]?.generated_text || response.data.summary_text || '';
  }

  parseMongoQuery(aiResponse, originalQuery) {
    try {
      // Extract JSON from response
      const jsonMatch = aiResponse.match(/\{[^}]*\}/);
      if (jsonMatch) {
        let queryStr = jsonMatch[0];
        
        // Handle date placeholders
        const now = Date.now();
        queryStr = queryStr.replace(/"DATE_30_DAYS_AGO"/g, `"${new Date(now - 30*24*60*60*1000).toISOString()}"`);
        queryStr = queryStr.replace(/"DATE_90_DAYS_AGO"/g, `"${new Date(now - 90*24*60*60*1000).toISOString()}"`);
        
        return JSON.parse(queryStr);
      }
      
      return this.fallbackQuery(originalQuery);
    } catch (error) {
      return this.fallbackQuery(originalQuery);
    }
  }

  fallbackQuery(query) {
    // Simple keyword-based fallback
    const lowerQuery = query.toLowerCase();
    const mongoQuery = {};
    
    if (lowerQuery.includes('spent') && lowerQuery.includes('over')) {
      const amount = query.match(/\d+/)?.[0];
      if (amount) mongoQuery.total_spend = { $gt: parseInt(amount) };
    }
    
    if (lowerQuery.includes('visit') && lowerQuery.includes('less')) {
      const visits = query.match(/\d+/)?.[0];
      if (visits) mongoQuery.visit_count = { $lt: parseInt(visits) };
    }
    
    return mongoQuery;
  }

  parseMessages(aiResponse) {
    const messages = aiResponse
      .split('\n')
      .filter(line => line.trim().length > 0)
      .slice(0, 3)
      .map(msg => msg.replace(/^\d+\.?\s*/, '').trim());
    
    return messages.length > 0 ? messages : this.fallbackMessages();
  }

  fallbackMessages() {
    return [
      "Hi {name}, here's 10% off on your next order! 🎉",
      "Don't miss out {name}! Special offer just for you! 💫",
      "Welcome back {name}! We've missed you - here's 15% off! ❤️"
    ];
  }

  fallbackSummary(stats) {
    const rate = ((stats.sent / stats.total) * 100).toFixed(1);
    return `Your campaign reached ${stats.total} customers with a ${rate}% delivery rate. ${stats.sent} messages were successfully delivered, showing strong engagement with your audience.`;
  }
}

module.exports = new AIService();
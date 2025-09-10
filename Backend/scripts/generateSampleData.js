const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Simple Customer schema (inline for testing)
const Customer = mongoose.model('Customer', {
  name: String,
  email: String,
  phone: String,
  total_spend: { type: Number, default: 0 },
  visit_count: { type: Number, default: 0 },
  last_visit: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now }
});

async function generateSampleData() {
  try {
    console.log('🔄 Generating sample data...');
    
    // Clear existing data
    await Customer.deleteMany({});
    
    // Generate 50 sample customers
    const customers = [];
    const names = ['Rajesh', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anita', 'Rohit', 'Kavya'];
    
    for (let i = 1; i <= 50; i++) {
      const randomName = names[Math.floor(Math.random() * names.length)];
      customers.push({
        name: `${randomName} ${i}`,
        email: `customer${i}@example.com`,
        phone: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        total_spend: Math.floor(Math.random() * 50000) + 1000,
        visit_count: Math.floor(Math.random() * 10) + 1,
        last_visit: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
      });
    }
    
    const savedCustomers = await Customer.insertMany(customers);
    console.log(`✅ Created ${savedCustomers.length} customers`);
    console.log('✅ Sample data generation complete!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating sample data:', error);
    process.exit(1);
  }
}

generateSampleData();
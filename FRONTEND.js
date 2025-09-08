// =============================================
// COMPLETE REACT FRONTEND FOR XENO CRM
// =============================================

// =============================================
// 1. PACKAGE.JSON
// =============================================
{
  "name": "xeno-crm-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.15.0",
    "react-scripts": "5.0.1",
    "axios": "^1.5.0",
    "bootstrap": "^5.3.0",
    "react-bootstrap": "^2.8.0",
    "react-toastify": "^9.1.3"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "proxy": "http://localhost:3000",
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}

// =============================================
// 2. APP.JS (Main Component)
// =============================================
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';

import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import CampaignDetails from './pages/CampaignDetails';
import Login from './pages/Login';
import DataImport from './pages/DataImport';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppContent />
          <ToastContainer 
            position="top-right" 
            autoClose={3000}
            hideProgressBar={false}
            closeOnClick
            pauseOnHover
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container-fluid mt-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignDetails />} />
          <Route path="/import" element={<DataImport />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}

export default App;

// =============================================
// 3. AUTH CONTEXT (Authentication Management)
// =============================================
// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
      apiService.setAuthToken(token);
    }
    setLoading(false);
  }, []);

  const login = async (email, name = 'User') => {
    try {
      const response = await apiService.login(email, name);
      if (response.success) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        setUser(response.user);
        apiService.setAuthToken(response.token);
        return { success: true };
      }
      return { success: false, error: response.error };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    apiService.setAuthToken(null);
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{height: '100vh'}}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// =============================================
// 4. API SERVICE (Backend Communication)
// =============================================
// src/services/api.js
import axios from 'axios';

class ApiService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error.response?.data || error.message);
      }
    );
  }

  setAuthToken(token) {
    if (token) {
      this.client.defaults.headers.Authorization = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.Authorization;
    }
  }

  // Auth APIs
  async login(email, name) {
    return this.client.post('/auth/login', { email, name });
  }

  // Customer APIs
  async getCustomers(params = {}) {
    return this.client.get('/customers', { params });
  }

  async createCustomer(customerData) {
    return this.client.post('/customers', customerData);
  }

  async bulkCreateCustomers(customers) {
    return this.client.post('/customers/bulk', { customers });
  }

  async previewAudience(query) {
    return this.client.post('/customers/preview', { query });
  }

  // Campaign APIs
  async getCampaigns() {
    return this.client.get('/campaigns');
  }

  async createCampaign(campaignData) {
    return this.client.post('/campaigns', campaignData);
  }

  async getCampaignDetails(campaignId) {
    return this.client.get(`/campaigns/${campaignId}`);
  }

  // AI APIs
  async convertNaturalLanguage(query) {
    return this.client.post('/ai/natural-to-rules', { query });
  }

  async generateMessages(objective, audience) {
    return this.client.post('/ai/generate-messages', { objective, audience });
  }

  async generateCampaignSummary(stats) {
    return this.client.post('/ai/campaign-summary', { stats });
  }

  // Order APIs
  async bulkCreateOrders(orders) {
    return this.client.post('/orders/bulk', { orders });
  }
}

export default new ApiService();

// =============================================
// 5. NAVBAR COMPONENT
// =============================================
// src/components/Navbar.js
import React from 'react';
import { Navbar, Nav, Container, Dropdown } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '../contexts/AuthContext';

function NavbarComponent() {
  const { user, logout } = useAuth();

  return (
    <Navbar bg="primary" variant="dark" expand="lg" sticky="top">
      <Container>
        <Navbar.Brand href="/">
          <strong>Xeno CRM</strong>
        </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <LinkContainer to="/">
              <Nav.Link>Dashboard</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/campaigns">
              <Nav.Link>Campaigns</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/import">
              <Nav.Link>Import Data</Nav.Link>
            </LinkContainer>
          </Nav>
          
          <Nav>
            <Dropdown align="end">
              <Dropdown.Toggle variant="outline-light" id="user-dropdown">
                👤 {user?.name || 'User'}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={logout}>
                  Logout
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavbarComponent;

// =============================================
// 6. RULE BUILDER COMPONENT (Main Feature)
// =============================================
// src/components/RuleBuilder.js
import React, { useState } from 'react';
import { Card, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import apiService from '../services/api';

function RuleBuilder({ onCampaignCreated }) {
  const [naturalQuery, setNaturalQuery] = useState('');
  const [rules, setRules] = useState([
    { field: 'total_spend', operator: '$gt', value: '' }
  ]);
  const [audienceSize, setAudienceSize] = useState(null);
  const [loading, setLoading] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [campaignMessage, setCampaignMessage] = useState('');
  const [generatedMessages, setGeneratedMessages] = useState([]);

  const fieldOptions = [
    { value: 'total_spend', label: 'Total Spend (₹)' },
    { value: 'visit_count', label: 'Visit Count' },
    { value: 'last_visit_days', label: 'Days Since Last Visit' }
  ];

  const operatorOptions = [
    { value: '$gt', label: 'Greater Than' },
    { value: '$lt', label: 'Less Than' },
    { value: '$gte', label: 'Greater Than or Equal' },
    { value: '$lte', label: 'Less Than or Equal' },
    { value: '$eq', label: 'Equal To' }
  ];

  const addRule = () => {
    setRules([...rules, { field: 'total_spend', operator: '$gt', value: '' }]);
  };

  const removeRule = (index) => {
    if (rules.length > 1) {
      const newRules = rules.filter((_, i) => i !== index);
      setRules(newRules);
    }
  };

  const updateRule = (index, field, value) => {
    const newRules = [...rules];
    newRules[index][field] = value;
    setRules(newRules);
  };

  const convertToRules = async () => {
    if (!naturalQuery.trim()) {
      toast.error('Please enter a description');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.convertNaturalLanguage(naturalQuery);
      if (response.success && response.mongo_query) {
        // Convert MongoDB query back to rules format
        const convertedRules = [];
        Object.entries(response.mongo_query).forEach(([field, condition]) => {
          if (typeof condition === 'object') {
            Object.entries(condition).forEach(([operator, value]) => {
              convertedRules.push({ field, operator, value: value.toString() });
            });
          } else {
            convertedRules.push({ field, operator: '$eq', value: condition.toString() });
          }
        });
        
        if (convertedRules.length > 0) {
          setRules(convertedRules);
          toast.success('✨ AI converted your query successfully!');
        }
      }
    } catch (error) {
      toast.error('AI conversion failed, please try manual rules');
    }
    setLoading(false);
  };

  const previewAudience = async () => {
    const mongoQuery = buildMongoQuery();
    if (Object.keys(mongoQuery).length === 0) {
      toast.error('Please add at least one rule with a value');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.previewAudience(mongoQuery);
      if (response.success) {
        setAudienceSize(response.count);
        if (response.count === 0) {
          toast.warning('No customers match these criteria');
        } else {
          toast.success(`Found ${response.count} matching customers!`);
        }
      }
    } catch (error) {
      toast.error('Failed to preview audience');
    }
    setLoading(false);
  };

  const generateMessages = async () => {
    const objective = campaignName || 'General marketing campaign';
    const audience = naturalQuery || 'targeted customers';

    setLoading(true);
    try {
      const response = await apiService.generateMessages(objective, audience);
      if (response.success && response.messages) {
        setGeneratedMessages(response.messages);
        toast.success('✨ AI generated campaign messages!');
      }
    } catch (error) {
      toast.error('Message generation failed');
    }
    setLoading(false);
  };

  const buildMongoQuery = () => {
    const query = {};
    rules.forEach(rule => {
      if (rule.value && rule.value.toString().trim()) {
        let value = rule.value;
        
        // Convert string numbers to actual numbers for numeric fields
        if (['total_spend', 'visit_count', 'last_visit_days'].includes(rule.field)) {
          value = parseFloat(value);
        }
        
        // Handle last_visit_days specially (convert to date)
        if (rule.field === 'last_visit_days') {
          const daysAgo = parseInt(value);
          const dateThreshold = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
          query.last_visit = { [rule.operator]: dateThreshold.toISOString() };
        } else {
          query[rule.field] = { [rule.operator]: value };
        }
      }
    });
    return query;
  };

  const createCampaign = async () => {
    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name');
      return;
    }

    if (!campaignMessage.trim()) {
      toast.error('Please enter a campaign message');
      return;
    }

    if (audienceSize === null) {
      toast.error('Please preview audience first');
      return;
    }

    if (audienceSize === 0) {
      toast.error('Cannot create campaign with 0 customers');
      return;
    }

    setLoading(true);
    try {
      const campaignData = {
        name: campaignName,
        rules: buildMongoQuery(),
        message: campaignMessage,
        created_by: 'user' // Will be replaced with actual user info
      };

      const response = await apiService.createCampaign(campaignData);
      if (response.success) {
        toast.success('🚀 Campaign created and delivery started!');
        
        // Reset form
        setCampaignName('');
        setCampaignMessage('');
        setAudienceSize(null);
        setGeneratedMessages([]);
        setNaturalQuery('');
        
        if (onCampaignCreated) {
          onCampaignCreated(response.data);
        }
      }
    } catch (error) {
      toast.error('Failed to create campaign');
    }
    setLoading(false);
  };

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-primary text-white">
        <h4 className="mb-0">🎯 Create Audience Segment</h4>
      </Card.Header>
      <Card.Body>
        {/* AI Natural Language Input */}
        <div className="mb-4 p-3 bg-light rounded">
          <h5 className="text-primary">🤖 AI-Powered Query Builder</h5>
          <Form.Group className="mb-3">
            <Form.Label>Describe your target audience:</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={naturalQuery}
              onChange={(e) => setNaturalQuery(e.target.value)}
              placeholder="e.g., Customers who spent over 5000 and haven't ordered in 30 days"
            />
          </Form.Group>
          <Button 
            variant="primary" 
            onClick={convertToRules}
            disabled={loading || !naturalQuery.trim()}
          >
            {loading ? <Spinner size="sm" /> : '✨'} Convert to Rules (AI)
          </Button>
        </div>

        <hr />

        {/* Manual Rule Builder */}
        <h5 className="text-secondary mb-3">📋 Manual Rule Builder</h5>
        {rules.map((rule, index) => (
          <Row key={index} className="mb-3 align-items-end">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Field</Form.Label>
                <Form.Select
                  value={rule.field}
                  onChange={(e) => updateRule(index, 'field', e.target.value)}
                >
                  {fieldOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Condition</Form.Label>
                <Form.Select
                  value={rule.operator}
                  onChange={(e) => updateRule(index, 'operator', e.target.value)}
                >
                  {operatorOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Value</Form.Label>
                <Form.Control
                  type="number"
                  value={rule.value}
                  onChange={(e) => updateRule(index, 'value', e.target.value)}
                  placeholder="Enter value"
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <div className="d-flex gap-2">
                {index === rules.length - 1 && (
                  <Button variant="success" size="sm" onClick={addRule}>
                    +
                  </Button>
                )}
                {rules.length > 1 && (
                  <Button variant="danger" size="sm" onClick={() => removeRule(index)}>
                    ×
                  </Button>
                )}
              </div>
            </Col>
          </Row>
        ))}

        {/* Audience Preview */}
        <div className="mb-4">
          <Button 
            variant="info" 
            onClick={previewAudience}
            disabled={loading}
            className="me-3"
          >
            {loading ? <Spinner size="sm" /> : '👥'} Preview Audience
          </Button>

          {audienceSize !== null && (
            <Alert variant={audienceSize > 0 ? 'success' : 'warning'} className="mt-3">
              <strong>🎯 Audience Size: {audienceSize.toLocaleString()} customers</strong>
              {audienceSize === 0 && (
                <div className="mt-2 small">
                  Try adjusting your rules to find matching customers.
                </div>
              )}
            </Alert>
          )}
        </div>

        {/* Campaign Creation */}
        {audienceSize > 0 && (
          <div className="mt-4 p-3 border rounded bg-light">
            <h5 className="text-success">📝 Create Campaign</h5>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Campaign Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g., Win Back High Value Customers"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Actions</Form.Label>
                  <div>
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={generateMessages}
                      disabled={loading}
                    >
                      {loading ? <Spinner size="sm" /> : '✨'} Generate Messages (AI)
                    </Button>
                  </div>
                </Form.Group>
              </Col>
            </Row>

            {/* Generated Messages */}
            {generatedMessages.length > 0 && (
              <div className="mb-3">
                <Form.Label>AI Generated Messages (Click to select):</Form.Label>
                <div className="d-flex flex-wrap gap-2">
                  {generatedMessages.map((msg, index) => (
                    <Button
                      key={index}
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setCampaignMessage(msg)}
                      className="text-start"
                    >
                      {msg}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Campaign Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={campaignMessage}
                onChange={(e) => setCampaignMessage(e.target.value)}
                placeholder="Hi {name}, here's a special offer for you!"
              />
              <Form.Text className="text-muted">
                Use {'{name}'} for personalization - it will be replaced with each customer's actual name.
              </Form.Text>
            </Form.Group>

            <Button 
              variant="success" 
              size="lg"
              onClick={createCampaign}
              disabled={loading || !campaignName.trim() || !campaignMessage.trim()}
            >
              {loading ? <Spinner size="sm" /> : '🚀'} Create & Launch Campaign
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

export default RuleBuilder;
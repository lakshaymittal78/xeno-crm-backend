// =============================================
// REACT PAGES AND ADDITIONAL COMPONENTS
// =============================================

// =============================================
// 7. DASHBOARD PAGE (Main Page)
// =============================================
// src/pages/Dashboard.js
import React, { useState } from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import RuleBuilder from '../components/RuleBuilder';

function Dashboard() {
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleCampaignCreated = (campaign) => {
    setShowSuccess(true);
    setTimeout(() => {
      navigate('/campaigns');
    }, 2000);
  };

  return (
    <Container fluid>
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="display-6">🎯 Campaign Dashboard</h1>
              <p className="text-muted">Create targeted campaigns with AI-powered audience segmentation</p>
            </div>
          </div>

          {showSuccess && (
            <Alert variant="success" className="mb-4">
              <h5>🎉 Campaign Created Successfully!</h5>
              <p className="mb-0">Redirecting to campaigns page to view delivery progress...</p>
            </Alert>
          )}

          <RuleBuilder onCampaignCreated={handleCampaignCreated} />
        </Col>
      </Row>
    </Container>
  );
}

export default Dashboard;

// =============================================
// 8. CAMPAIGNS PAGE (Campaign History)
// =============================================
// src/pages/Campaigns.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Spinner, Alert, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiService from '../services/api';

function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCampaigns();
      if (response.success) {
        setCampaigns(response.data);
      }
    } catch (error) {
      setError('Failed to load campaigns');
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { variant: 'warning', text: 'In Progress' },
      completed: { variant: 'success', text: 'Completed' },
      failed: { variant: 'danger', text: 'Failed' }
    };
    
    const config = statusConfig[status] || { variant: 'secondary', text: status };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };

  const calculateDeliveryRate = (stats) => {
    if (stats.total === 0) return '0%';
    return `${((stats.sent / stats.total) * 100).toFixed(1)}%`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading campaigns...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <h5>Error Loading Campaigns</h5>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={fetchCampaigns}>
            Retry
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="display-6">📈 Campaign History</h1>
              <p className="text-muted">Track performance of all your marketing campaigns</p>
            </div>
            <Button 
              variant="primary" 
              onClick={() => navigate('/')}
              size="lg"
            >
              ➕ Create New Campaign
            </Button>
          </div>

          {campaigns.length === 0 ? (
            <Card className="text-center p-5">
              <Card.Body>
                <h3 className="text-muted">📭 No Campaigns Yet</h3>
                <p className="text-muted mb-4">
                  You haven't created any campaigns yet. Start by creating your first targeted campaign!
                </p>
                <Button variant="primary" onClick={() => navigate('/')}>
                  Create Your First Campaign
                </Button>
              </Card.Body>
            </Card>
          ) : (
            <Card>
              <Card.Header className="bg-light">
                <h5 className="mb-0">All Campaigns ({campaigns.length})</h5>
              </Card.Header>
              <Card.Body className="p-0">
                <Table responsive hover className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Campaign</th>
                      <th>Status</th>
                      <th>Audience
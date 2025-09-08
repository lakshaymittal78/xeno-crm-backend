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
    }, 1200);
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

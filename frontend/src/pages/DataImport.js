// src/pages/DataImport.js
import React, { useState } from 'react';
import { Container, Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import apiService from '../services/api';

function DataImport() {
  const [customersJson, setCustomersJson] = useState('');
  const [ordersJson, setOrdersJson] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCustomersUpload = async () => {
    try {
      const data = JSON.parse(customersJson);
      if (!Array.isArray(data)) return toast.error('Customers JSON must be an array');
      setLoading(true);
      const res = await apiService.bulkCreateCustomers(data);
      if (res && res.success) {
        toast.success(`Inserted ${res.inserted ?? 'unknown'} customers`);
        setCustomersJson('');
      } else {
        toast.error('Upload failed');
      }
    } catch (err) {
      toast.error('Invalid JSON: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOrdersUpload = async () => {
    try {
      const data = JSON.parse(ordersJson);
      if (!Array.isArray(data)) return toast.error('Orders JSON must be an array');
      setLoading(true);
      const res = await apiService.bulkCreateOrders(data);
      if (res && res.success) {
        toast.success(`Inserted ${res.inserted ?? 'unknown'} orders`);
        setOrdersJson('');
      } else {
        toast.error('Upload failed');
      }
    } catch (err) {
      toast.error('Invalid JSON: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const sampleCustomers = [
    { name: "Test User 1", email: "test1@example.com", phone: "+911234567890", total_spend: 0, visit_count: 0 },
    { name: "Test User 2", email: "test2@example.com", phone: "+919876543210", total_spend: 0, visit_count: 0 }
  ];

  return (
    <Container fluid>
      <Row>
        <Col md={8}>
          <Card className="mb-4">
            <Card.Header><strong>Import Customers (JSON array)</strong></Card.Header>
            <Card.Body>
              <Form.Group className="mb-2">
                <Form.Control
                  as="textarea"
                  rows={8}
                  placeholder={JSON.stringify(sampleCustomers, null, 2)}
                  value={customersJson}
                  onChange={(e) => setCustomersJson(e.target.value)}
                />
              </Form.Group>
              <div className="d-flex gap-2">
                <Button variant="primary" onClick={handleCustomersUpload} disabled={loading}>
                  {loading ? 'Uploading...' : 'Upload Customers'}
                </Button>
                <Button variant="outline-secondary" onClick={() => setCustomersJson(JSON.stringify(sampleCustomers, null, 2))}>
                  Fill sample
                </Button>
              </div>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header><strong>Import Orders (JSON array)</strong></Card.Header>
            <Card.Body>
              <Form.Group className="mb-2">
                <Form.Control
                  as="textarea"
                  rows={6}
                  placeholder='[ { "customer_id": "xxxx", "amount": 1000, "order_date": "2025-09-01T12:00:00Z" } ]'
                  value={ordersJson}
                  onChange={(e) => setOrdersJson(e.target.value)}
                />
              </Form.Group>
              <div className="d-flex gap-2">
                <Button variant="primary" onClick={handleOrdersUpload} disabled={loading}>
                  {loading ? 'Uploading...' : 'Upload Orders'}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card>
            <Card.Header><strong>Tips</strong></Card.Header>
            <Card.Body>
              <p className="small text-muted">
                - The backend expects arrays for bulk endpoints. See the example format above. <br />
                - For orders use valid `customer_id` values from Mongo (ObjectId strings). <br />
                - If you prefer, run the sample data generator script on the backend to create many customers & orders. (See README / scripts.)
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default DataImport;

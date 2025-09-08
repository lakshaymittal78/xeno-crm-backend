// src/pages/Login.js
import React, { useState } from 'react';
import { Container, Card, Form, Button } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const doLogin = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      return toast.error('Email required');
    }
    setLoading(true);
    try {
      const resp = await login(email.trim(), name.trim() || 'User');
      if (resp.success) {
        toast.success('Logged in');
        navigate('/');
      } else {
        toast.error(resp.error || 'Login failed');
      }
    } catch (err) {
      toast.error('Login error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{minHeight: '80vh'}}>
      <Card style={{width: 420}}>
        <Card.Body>
          <h4 className="mb-3">Sign in</h4>
          <Form onSubmit={doLogin}>
            <Form.Group className="mb-2">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Name (optional)</Form.Label>
              <Form.Control value={name} onChange={(e)=>setName(e.target.value)} />
            </Form.Group>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Login;

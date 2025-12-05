import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FormBuilder from './pages/FormBuilder';
import FormFiller from './pages/FormFiller';
import Responses from './pages/Responses';

const App = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);  
      window.history.replaceState({}, "", "/dashboard");  
    }
  }, []);

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create-form" element={<FormBuilder />} />
        <Route path="/form/:formId" element={<FormFiller />} />
        <Route path="/responses/:formId" element={<Responses />} />
      </Routes>
    </Router>
  );
};

const Navbar = () => {
  const location = useLocation();
  
  // Hide navbar on these pages
  if (location.pathname === '/' || location.pathname.startsWith('/form/')) {
    return null; // No navbar
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    window.location.href = '/';
  };

  return (
    <nav style={{
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #ddd'
    }}>
      <Link to="/dashboard" style={{ marginRight: '15px' }}>Dashboard</Link>
      <Link
        to="/"
        onClick={handleLogout}
        style={{ float: 'right' }}
      >
        Logout
      </Link>
    </nav>
  );
};

export default App;
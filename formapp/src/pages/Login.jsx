import React from 'react';

export default function Login() {
  const handleLogin = () => {
    window.location.href = 'https://formapp-3hsh.onrender.com/api/auth/airtable';
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Airtable Form Builder</h1>
      <button 
        onClick={handleLogin}
        style={styles.loginButton}
      >
        Login with Airtable
      </button>
    </div>
  );
}

const styles = {
  container: {
    textAlign: 'center',
    padding: 'clamp(30px, 10vw, 50px)',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 'clamp(24px, 6vw, 36px)',
    color: 'black',
    marginBottom: 'clamp(20px, 5vw, 30px)',
  },
  loginButton: {
    padding: 'clamp(12px, 3vw, 18px) clamp(24px, 6vw, 36px)',
    fontSize: 'clamp(16px, 4vw, 20px)',
    backgroundColor: 'white',
    color: 'black',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    fontWeight: 'bold',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    transition: 'transform 0.3s, box-shadow 0.3s'
  }
};
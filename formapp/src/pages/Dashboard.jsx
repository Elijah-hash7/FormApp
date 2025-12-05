import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const Dashboard = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const res = await api.get('/forms/user/forms');
      setForms(res.data.forms || []);
    } catch (error) {
      console.error('Failed to fetch forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (formId) => {
    const link = `${window.location.origin}/form/${formId}`;
    navigator.clipboard.writeText(link);
    alert('Form link copied! 📋');
  };

  const viewResponses = (formId) => {
    navigate(`/responses/${formId}`);
  };

  const createNewForm = () => {
    navigate('/create-form');
  };

  const deleteForm = async (formId, formName) => {
    if (!window.confirm(`Are you sure you want to delete "${formName}"? This will delete all responses too!`)) {
      return;
    }

    try {
      await api.delete(`/forms/${formId}`);
      alert('Form deleted successfully! ✅');
      fetchForms();
    } catch (error) {
      console.error('Failed to delete form:', error);
      alert('Failed to delete form ❌');
    }
  };

  if (loading) return (
    <div style={styles.loadingContainer}>
      <div>Loading...</div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>Your Forms</h1>
            <p style={styles.subtitle}>Manage your smart forms</p>
          </div>
          <button 
            onClick={createNewForm} 
            style={styles.createButton}
          >
            Create New Form
          </button>
        </div>
      </div>

      <div style={styles.content}>
        {forms.length === 0 ? (
          <div style={styles.emptyState}>
            <h2 style={styles.emptyTitle}>No forms yet</h2>
            <p style={styles.emptyText}>Create your first smart form to get started!</p>
            <button 
              onClick={createNewForm} 
              style={styles.createFirstButton}
            >
              Create First Form
            </button>
          </div>
        ) : (
          <div style={styles.grid}>
            {forms.map(form => (
              <div 
                key={form._id} 
                style={styles.card}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
              >
                <h3 style={styles.cardTitle}>{form.name}</h3>
                <p style={styles.cardDate}>
                  Created: {new Date(form.createdAt).toLocaleDateString()}
                </p>

                <div style={styles.cardActions}>
                  <div style={styles.buttonRow}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        copyLink(form._id);
                      }}
                      style={styles.copyButton}
                    >
                      Copy Link
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        viewResponses(form._id);
                      }}
                      style={styles.viewButton}
                    >
                      👁️ View Responses
                    </button>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteForm(form._id, form.name);
                    }}
                    style={styles.deleteButton}
                  >
                    Delete Form
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f5'
  },
  header: {
    background: 'white',
    padding: 'clamp(12px, 3vw, 20px) clamp(15px, 4vw, 30px)',
    borderBottom: '2px solid #e0e0e0'
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 'clamp(10px, 3vw, 20px)'
  },
  title: {
    margin: 0,
    fontSize: 'clamp(20px, 5vw, 28px)'
  },
  subtitle: {
    margin: 'clamp(3px, 1vw, 5px) 0 0 0',
    color: '#666',
    fontSize: 'clamp(12px, 3vw, 14px)'
  },
  createButton: {
    padding: 'clamp(8px, 2vw, 12px) clamp(16px, 3vw, 24px)',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: 'clamp(14px, 3vw, 16px)',
    whiteSpace: 'nowrap'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: 'clamp(20px, 5vw, 30px) clamp(15px, 4vw, 20px)',
    width: '100%',
    boxSizing: 'border-box'
  },
  emptyState: {
    textAlign: 'center',
    padding: 'clamp(30px, 8vw, 60px) clamp(15px, 4vw, 20px)',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  emptyTitle: {
    color: '#666',
    fontSize: 'clamp(18px, 4vw, 24px)',
    marginBottom: '10px'
  },
  emptyText: {
    color: '#999',
    fontSize: 'clamp(14px, 3vw, 16px)',
    marginBottom: '20px'
  },
  createFirstButton: {
    padding: 'clamp(10px, 2vw, 12px) clamp(20px, 4vw, 24px)',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: 'clamp(14px, 3vw, 16px)',
    fontWeight: 'bold'
  },
  grid: {
    display: 'grid',
    gap: 'clamp(15px, 3vw, 20px)',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 350px), 1fr))'
  },
  card: {
    background: 'white',
    padding: 'clamp(15px, 3vw, 25px)',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  cardTitle: {
    margin: '0 0 clamp(8px, 2vw, 10px)',
    fontSize: 'clamp(18px, 4vw, 20px)'
  },
  cardDate: {
    margin: '0 0 clamp(15px, 3vw, 20px)',
    color: '#666',
    fontSize: 'clamp(12px, 3vw, 14px)'
  },
  cardActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(8px, 2vw, 10px)'
  },
  buttonRow: {
    display: 'flex',
    gap: 'clamp(6px, 1.5vw, 8px)'
  },
  copyButton: {
    flex: 1,
    padding: 'clamp(8px, 2vw, 10px)',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    minWidth: '0'
  },
  viewButton: {
    flex: 1,
    padding: 'clamp(8px, 2vw, 10px)',
    background: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    minWidth: '0'
  },
  deleteButton: {
    padding: 'clamp(8px, 2vw, 10px)',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: 'clamp(12px, 2.5vw, 14px)'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: 'clamp(30px, 10vw, 40px)',
    fontSize: 'clamp(16px, 4vw, 20px)'
  }
};

export default Dashboard;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api';

const Responses = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});

  useEffect(() => {
    fetchResponses();
  }, [formId]);

  const deleteResponse = async (responseId) => {
    if (!window.confirm('Delete this response from Airtable???')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/responses/${responseId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorText = await res.text();
        alert('Delete failed: ' + errorText);
        return;
      }

      alert('✅ Response deleted!');
      setResponses(responses.filter(r => r._id !== responseId));
    } catch (error) {
      console.error('Delete response error:', error);
      alert('Failed to delete response');
    }
  };

  const startEdit = (response) => {
    setEditingId(response._id);
    setEditValues(response.answers);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = async (responseId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/responses/${responseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers: editValues })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Failed to update response');
        return;
      }

      alert('✅ Response updated!');
      setResponses(responses.map(r => 
        r._id === responseId 
          ? { ...r, answers: editValues, updatedAt: new Date() }
          : r
      ));
      setEditingId(null);
      setEditValues({});
    } catch (error) {
      console.error('Update response error:', error);
      alert('Failed to update response');
    }
  };

  const fetchResponses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/responses/forms/${formId}/responses`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      const normalized = Array.isArray(data) ? data : (data.responses || []);
      setResponses(normalized);
    } catch (error) {
      console.error('Failed to fetch responses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <h2>Loading responses...</h2>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button
          onClick={() => navigate('/dashboard')}
          style={styles.backButton}
        >
          ← Back to Dashboard
        </button>
        <h1 style={styles.title}>📊 Form Responses</h1>
        <p style={styles.subtitle}>
          Total submissions: <strong>{responses.length}</strong>
        </p>
      </div>

      <div style={styles.content}>
        {responses.length === 0 ? (
          <div style={styles.emptyState}>
            <h2 style={styles.emptyTitle}>No responses yet</h2>
            <p style={styles.emptyText}>Share your form to start collecting responses!</p>
          </div>
        ) : (
          <div style={styles.tableWrapper}>
            <div style={styles.tableResponsive}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.tableCell}>Date</th>
                    {Object.keys(responses[0]?.answers || {}).map(key => (
                      <th key={key} style={styles.tableCell}>
                        {key}
                      </th>
                    ))}
                    <th style={{ ...styles.tableCell, textAlign: 'center' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((response, index) => {
                    const isEditing = editingId === response._id;
                    return (
                      <tr 
                        key={response._id} 
                        style={{
                          ...styles.tableRow,
                          background: isEditing 
                            ? '#fff3cd' 
                            : (index % 2 === 0 ? 'white' : '#f8f9fa')
                        }}
                      >
                        <td style={styles.tableCell}>
                          <div style={styles.date}>
                            {new Date(response.createdAt).toLocaleDateString()}
                          </div>
                          <div style={styles.time}>
                            {new Date(response.createdAt).toLocaleTimeString()}
                          </div>
                        </td>

                        {Object.entries(response.answers || {}).map(([key, value]) => (
                          <td key={key} style={styles.tableCell}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editValues[key] || ''}
                                onChange={(e) => setEditValues({ ...editValues, [key]: e.target.value })}
                                style={styles.editInput}
                              />
                            ) : (
                              <span style={styles.answerText}>
                                {Array.isArray(value)
                                  ? `[${value.length} file(s)]`
                                  : typeof value === 'object'
                                    ? JSON.stringify(value)
                                    : value?.toString() || '(empty)'}
                              </span>
                            )}
                          </td>
                        ))}

                        <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                          {isEditing ? (
                            <div style={styles.actionButtons}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  saveEdit(response._id);
                                }}
                                style={styles.saveButton}
                              >
                                ✓ Save
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  cancelEdit();
                                }}
                                style={styles.cancelButton}
                              >
                                ✕ Cancel
                              </button>
                            </div>
                          ) : (
                            <div style={styles.actionButtons}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  startEdit(response);
                                }}
                                style={styles.editButton}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  deleteResponse(response._id);
                                }}
                                style={styles.deleteButton}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
    borderBottom: '2px solid #e0e0e0',
    marginBottom: 'clamp(15px, 3vw, 20px)'
  },
  backButton: {
    padding: 'clamp(6px, 1.5vw, 10px) clamp(12px, 3vw, 20px)',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: 'clamp(8px, 2vw, 12px)',
    fontWeight: 'bold',
    fontSize: 'clamp(12px, 3vw, 14px)'
  },
  title: {
    margin: 'clamp(5px, 1.5vw, 10px) 0 clamp(3px, 1vw, 5px)',
    fontSize: 'clamp(20px, 5vw, 28px)'
  },
  subtitle: {
    margin: 0,
    color: '#666',
    fontSize: 'clamp(14px, 3vw, 16px)'
  },
  content: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 clamp(10px, 3vw, 20px) clamp(20px, 5vw, 40px)',
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
    fontSize: 'clamp(14px, 3vw, 16px)'
  },
  tableWrapper: {
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    width: '100%'
  },
  tableResponsive: {
    overflowX: 'auto',
    width: '100%'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '600px'
  },
  tableHeader: {
    background: '#f8f9fa'
  },
  tableRow: {
    '@media (max-width: 768px)': {
      display: 'block',
      marginBottom: '15px',
      border: '1px solid #dee2e6',
      borderRadius: '8px'
    }
  },
  tableCell: {
    padding: 'clamp(10px, 2vw, 15px)',
    borderBottom: '1px solid #dee2e6',
    textAlign: 'left',
    fontWeight: 'bold',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    whiteSpace: 'nowrap'
  },
  date: {
    fontSize: 'clamp(12px, 2.5vw, 14px)'
  },
  time: {
    fontSize: 'clamp(11px, 2vw, 12px)',
    color: '#666'
  },
  editInput: {
    width: '100%',
    padding: 'clamp(4px, 1vw, 6px)',
    border: '2px solid #ffc107',
    borderRadius: '4px',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    boxSizing: 'border-box'
  },
  answerText: {
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    wordBreak: 'break-word'
  },
  actionButtons: {
    display: 'flex',
    gap: 'clamp(3px, 1vw, 5px)',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  saveButton: {
    padding: 'clamp(4px, 1vw, 6px) clamp(8px, 2vw, 12px)',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: 'clamp(11px, 2vw, 12px)',
    fontWeight: 'bold',
    minWidth: '60px'
  },
  cancelButton: {
    padding: 'clamp(4px, 1vw, 6px) clamp(8px, 2vw, 12px)',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: 'clamp(11px, 2vw, 12px)',
    fontWeight: 'bold',
    minWidth: '60px'
  },
  editButton: {
    padding: 'clamp(4px, 1vw, 6px) clamp(8px, 2vw, 12px)',
    background: '#ffc107',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: 'clamp(11px, 2vw, 12px)',
    fontWeight: 'bold',
    minWidth: '60px'
  },
  deleteButton: {
    padding: 'clamp(4px, 1vw, 6px) clamp(8px, 2vw, 12px)',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: 'clamp(11px, 2vw, 12px)',
    fontWeight: 'bold',
    minWidth: '60px'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: 'clamp(30px, 10vw, 40px)',
    fontSize: 'clamp(16px, 4vw, 20px)'
  }
};

export default Responses;
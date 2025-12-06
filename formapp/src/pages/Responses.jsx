import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Responses.css';

const API_URL = 'http://localhost:5000/api';

const Responses = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchResponses();
  }, [formId]);

  const deleteResponse = async (responseId) => {
    if (!window.confirm('Delete this response from Airtable? It will be flagged as deleted.')) {
      return;
    }

    setDeleting(responseId);
    console.log('🗑️ Deleting response:', responseId);

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_URL}/responses/${responseId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Delete status:', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Delete failed:', errorText);
        alert('Delete failed: ' + errorText);
        setDeleting(null);
        return;
      }

      const result = await res.json();
      console.log('Delete result:', result);

      alert('✅ Response deleted!');
      setResponses(responses.filter(r => r._id !== responseId));

    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const startEdit = (response) => {
    console.log('✏️ Starting edit for:', response._id);
    setEditingId(response._id);
    setEditValues({ ...response.answers });
  };

  const cancelEdit = () => {
    console.log('❌ Canceling edit');
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = async (responseId) => {
    console.log('💾 Saving edit for:', responseId);
    console.log('New values:', editValues);

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

      console.log('Update status:', res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Update failed:', errorData);
        alert(errorData.error || 'Failed to update');
        return;
      }

      const result = await res.json();
      console.log('Update result:', result);

      alert('✅ Response updated!');

      setResponses(responses.map(r =>
        r._id === responseId
          ? { ...r, answers: editValues, updatedAt: new Date() }
          : r
      ));

      setEditingId(null);
      setEditValues({});

    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update: ' + error.message);
    }
  };

  const fetchResponses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      console.log('📊 Fetching responses for form:', formId);

      const res = await fetch(`${API_URL}/responses/forms/${formId}/responses`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        console.error('Failed to fetch, status:', res.status);
        setResponses([]);
        return;
      }

      const data = await res.json();
      console.log('✅ Responses fetched:', data.length);

      const normalized = Array.isArray(data) ? data : (data.responses || []);
      setResponses(normalized);

    } catch (error) {
      console.error('Fetch error:', error);
      setResponses([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <h2>Loading responses...</h2>
      </div>
    );
  }

  return (
    <div className="responses-container">
      {/* HEADER */}
      <div className="responses-header">
        <button
          onClick={() => navigate('/dashboard')}
          className="back-button"
        >
          ← Back to Dashboard
        </button>
        <h1 className="responses-title">📊 Form Responses</h1>
        <p className="responses-subtitle">
          Total submissions: <strong>{responses.length}</strong>
        </p>
      </div>

      <div className="responses-content">
        {responses.length === 0 ? (
          <div className="empty-state">
            <h2>No responses yet</h2>
            <p>Share your form to start collecting responses!</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <div className="table-responsive">
              <table className="responses-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    {Object.keys(responses[0]?.answers || {}).map(key => (
                      <th key={key}>{key}</th>
                    ))}
                    <th className="actions-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((response, index) => {
                    const isEditing = editingId === response._id;
                    const isDeleting = deleting === response._id;

                    return (
                      <tr
                        key={response._id}
                        className={`${isEditing ? 'editing' : ''} ${isDeleting ? 'deleting' : ''}`}
                      >
                        <td className="date-cell">
                          <div className="date">
                            {new Date(response.createdAt).toLocaleDateString()}
                          </div>
                          <div className="time">
                            {new Date(response.createdAt).toLocaleTimeString()}
                          </div>
                        </td>

                        {Object.entries(response.answers || {}).map(([key, value]) => (
                          <td key={key}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editValues[key] || ''}
                                onChange={(e) => setEditValues({ ...editValues, [key]: e.target.value })}
                                className="edit-input"
                              />
                            ) : (
                              <span className="answer-text">
                                {Array.isArray(value)
                                  ? `[${value.length} file(s)]`
                                  : typeof value === 'object'
                                  ? JSON.stringify(value)
                                  : value?.toString() || '(empty)'}
                              </span>
                            )}
                          </td>
                        ))}

                        <td className="actions-cell">
                          {isEditing ? (
                            <div className="action-buttons">
                              <button
                                onClick={() => saveEdit(response._id)}
                                className="btn btn-save"
                              >
                                ✓ Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="btn btn-cancel"
                              >
                                ✕ Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="action-buttons">
                              <button
                                onClick={() => startEdit(response)}
                                disabled={isDeleting}
                                className="btn btn-edit"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => deleteResponse(response._id)}
                                disabled={isDeleting}
                                className="btn btn-delete"
                              >
                                {isDeleting ? 'Deleting...' : '🗑️ Delete'}
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

export default Responses;
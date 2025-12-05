import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api';

const FormBuilder = () => {
  const [formName, setFormName] = useState('');
  const [bases, setBases] = useState([]);
  const [tables, setTables] = useState([]);
  const [fields, setFields] = useState([]);
  const [selected, setSelected] = useState({});
  const [questions, setQuestions] = useState([]);
  const [conditionalRules, setConditionalRules] = useState({});
  const [tempConditions, setTempConditions] = useState({});
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    fetchBases();
  }, []);

  const fetchBases = async () => {
    const res = await fetch(`${API_URL}/airtable/bases`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setBases(data.bases || []);
  };

  const handleBaseChange = async (baseId) => {
    setSelected({ baseId });
    setTables([]);
    setFields([]);
    setQuestions([]);
    setConditionalRules({});
    setTempConditions({});
    const res = await fetch(`${API_URL}/airtable/bases/${baseId}/tables`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setTables(data.tables || []);
  };

  const onBack = () => navigate('/dashboard');

  const handleTableChange = async (tableId) => {
    setSelected(prev => ({ ...prev, tableId }));
    setFields([]);
    setQuestions([]);
    setConditionalRules({});
    setTempConditions({});
    const res = await fetch(`${API_URL}/airtable/bases/${selected.baseId}/tables/${tableId}/fields`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setFields(data.fields || []);
  };

  const toggleQuestion = (field) => {
    const exists = questions.find(q => q.id === field.id);
    if (exists) {
      setQuestions(questions.filter(q => q.id !== field.id));
      const newRules = { ...conditionalRules };
      delete newRules[field.id];
      setConditionalRules(newRules);
      const newTemp = { ...tempConditions };
      delete newTemp[field.id];
      setTempConditions(newTemp);
    } else {
      setQuestions([...questions, field]);
    }
  };

  
  const addCondition = (questionId) => {
    const temp = tempConditions[questionId];
    if (!temp?.targetQuestion || !temp?.operator || temp?.value === undefined || temp?.value === '') {
      alert('Please fill all condition fields');
      return;
    }

    // Here sets the condtion if the user chooses a specific answer
    const targetQ = questions.find(q => q.id === temp.targetQuestion);
    const newCondition = {
      questionKey: targetQ.name.toLowerCase().replace(/\s+/g, '_'),
      operator: temp.operator,
      value: temp.value
    };

    setConditionalRules(prev => ({
      ...prev,
      [questionId]: {
        logic: prev[questionId]?.logic || 'AND',
        conditions: [...(prev[questionId]?.conditions || []), newCondition]
      }
    }));

    setTempConditions(prev => {
      const newTemp = { ...prev };
      delete newTemp[questionId];
      return newTemp;
    });

    alert(`✅ Condition added! "${targetQ.name} ${temp.operator} ${temp.value}"`);
  };

  const removeCondition = (questionId, conditionIndex) => {
    setConditionalRules(prev => {
      const rules = { ...prev };
      rules[questionId].conditions.splice(conditionIndex, 1);
      if (rules[questionId].conditions.length === 0) {
        delete rules[questionId];
      }
      return rules;
    });
  };

  const handleCreate = async () => {
    if (!formName || !selected.baseId || !selected.tableId || questions.length === 0) {
      alert('Please fill all required fields and select at least one question');
      return;
    }

    const questionsToSend = questions.map(q => ({
      questionKey: q.name.toLowerCase().replace(/\s+/g, '_'),
      fieldId: q.id,
      label: q.name,
      type: q.type,
      required: false,
      options: q.options?.choices?.map(c => c.name) || [],
      conditionalRules: conditionalRules[q.id] || null
    }));

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/forms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formName,
          airtableBaseId: selected.baseId,
          airtableTableId: selected.tableId,
          questions: questionsToSend
        })
      });

      if (res.ok) {
        alert('Form created successfully!');
        setFormName('');
        setQuestions([]);
        setConditionalRules({});
        setTempConditions({});
        onBack();
      } else {
        const error = await res.json();
        alert('Failed to create form: ' + (error.message || 'Unknown error'));
      }
    } catch (err) {
      alert('Error creating form: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getConditionValueInput = (questionId) => {
    const temp = tempConditions[questionId];
    if (!temp?.targetQuestion) {
      return (
        <input
          type="text"
          placeholder="value"
          disabled
          style={styles.disabledInput}
        />
      );
    }

    const targetQ = questions.find(q => q.id === temp.targetQuestion);
    if (targetQ?.type === 'singleSelect' && targetQ?.options?.choices) {
      return (
        <select
          value={temp.value || ''}
          onChange={(e) => {
            setTempConditions(prev => ({
              ...prev,
              [questionId]: { ...prev[questionId], value: e.target.value }
            }));
          }}
          style={styles.selectInput}
        >
          <option value="">Select value...</option>
          {targetQ.options.choices.map((choice, idx) => (
            <option key={idx} value={choice.name}>{choice.name}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="text"
        placeholder="value"
        value={temp.value || ''}
        onChange={(e) => {
          setTempConditions(prev => ({
            ...prev,
            [questionId]: { ...prev[questionId], value: e.target.value }
          }));
        }}
        style={styles.textInput}
      />
    );
  };

  return (
    <div style={styles.container}>
      <button onClick={onBack} style={styles.backButton}>← Back</button>
      <h2 style={styles.title}>Create Form</h2>

      <div style={styles.formCard}>
        <div style={styles.formGroup}>
          <label style={styles.label}><strong>Form Name:</strong></label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            style={styles.formInput}
            placeholder="Enter form name"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}><strong>Base:</strong></label>
          <select
            value={selected.baseId || ''}
            onChange={(e) => handleBaseChange(e.target.value)}
            style={styles.formInput}
          >
            <option value="">-- Select Base --</option>
            {bases.map(base => (
              <option key={base.id} value={base.id}>{base.name}</option>
            ))}
          </select>
        </div>

        {selected.baseId && (
          <div style={styles.formGroup}>
            <label style={styles.label}><strong>Table:</strong></label>
            <select
              value={selected.tableId || ''}
              onChange={(e) => handleTableChange(e.target.value)}
              style={styles.formInput}
            >
              <option value="">-- Select Table --</option>
              {tables.map(table => (
                <option key={table.id} value={table.id}>{table.name}</option>
              ))}
            </select>
          </div>
        )}

        {fields.length > 0 && (
          <div style={styles.formGroup}>
            <label style={styles.label}><strong>Select Fields for Form:</strong></label>
            <div style={styles.fieldsContainer}>
              {fields.map(field => (
                <div key={field.id} style={styles.fieldItem}>
                  <label style={styles.fieldLabel}>
                    <input
                      type="checkbox"
                      checked={questions.some(q => q.id === field.id)}
                      onChange={() => toggleQuestion(field)}
                      style={styles.checkbox}
                    />
                    {' '}<strong>{field.name}</strong>{' '}
                    <span style={styles.fieldType}>({field.type})</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {questions.length > 0 && (
          <div style={styles.selectedCount}>
            <strong>✓ Selected: {questions.length} field(s)</strong>
          </div>
        )}

        {questions.length > 1 && (
          <div style={styles.conditionalSection}>
            {questions.map((q, idx) => {
              if (idx < 2) return null;
              return (
                <div key={q.id} style={styles.conditionalCard}>
                  {conditionalRules[q.id]?.conditions?.length > 0 && (
                    <div style={styles.activeConditions}>
                      <div style={styles.conditionsTitle}>
                        ACTIVE ({conditionalRules[q.id].logic}):
                      </div>
                      {conditionalRules[q.id].conditions.map((cond, condIdx) => (
                        <div key={condIdx} style={styles.conditionItem}>
                          <span style={styles.conditionText}>
                            <strong>{cond.questionKey}</strong> {cond.operator} "{cond.value}"
                          </span>
                          <button
                            onClick={() => removeCondition(q.id, condIdx)}
                            style={styles.removeButton}
                          >
                            ✕ Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={styles.conditionalTitle}>
                    Show "{q.name}" only if:
                  </div>
                  <div style={styles.conditionGrid}>
                    <select
                      value={tempConditions[q.id]?.targetQuestion || ''}
                      onChange={(e) => {
                        setTempConditions(prev => ({
                          ...prev,
                          [q.id]: { targetQuestion: e.target.value, operator: 'equals', value: '' }
                        }));
                      }}
                      style={styles.conditionSelect}
                    >
                      <option value="">← Select question</option>
                      {questions
                        .filter((q2, idx2) => idx2 < idx && q2.name === 'Role')
                        .map(q2 => (
                          <option key={q2.id} value={q2.id}>{q2.name}</option>
                        ))}
                    </select>

                    <select
                      value={tempConditions[q.id]?.operator || 'equals'}
                      onChange={(e) => {
                        setTempConditions(prev => ({
                          ...prev,
                          [q.id]: { ...prev[q.id], operator: e.target.value }
                        }));
                      }}
                      style={styles.conditionSelect}
                    >
                      <option value="equals">equals</option>
                      <option value="notEquals">not equals</option>
                    </select>

                    {getConditionValueInput(q.id)}

                    <button
                      onClick={() => addCondition(q.id)}
                      style={styles.addButton}
                    >
                      ADD
                    </button>
                  </div>

                  {conditionalRules[q.id]?.conditions?.length > 0 && (
                    <div style={styles.logicSelect}>
                      <label style={styles.logicLabel}>
                        Show if{' '}
                        <select
                          value={conditionalRules[q.id]?.logic || 'OR'}
                          onChange={(e) => {
                            setConditionalRules(prev => ({
                              ...prev,
                              [q.id]: { ...prev[q.id], logic: e.target.value }
                            }));
                          }}
                          style={styles.logicDropdown}
                        >
                          <option value="OR">ANY</option>
                          <option value="AND">ALL</option>
                        </select>
                        {' '}conditions match
                      </label>
                    </div>
                  )}

                  <div style={styles.quickSetup}>
                    <strong style={styles.quickSetupTitle}>Quick Setup:</strong>
                    {q.name.toLowerCase().includes('github') && (
                      <button
                        onClick={() => {
                          const roleField = questions.find(q2 => q2.name === 'Role');
                          if (roleField) {

                            // sets the github to show if the role is Engineer
                            setConditionalRules(prev => ({
                              ...prev,
                              [q.id]: {
                                logic: 'AND',
                                conditions: [{
                                  questionKey: 'role',
                                  operator: 'equals',
                                  value: 'Engineer'
                                }]
                              }
                            }));
                            alert('Set: Show when Role = Engineer');
                          }
                        }}
                        style={styles.quickButton}
                      >
                        ⚡ Show when Role = Engineer
                      </button>
                    )}
                    {q.name.toLowerCase().includes('portfolio') && (
                      <button
                        onClick={() => {
                          const roleField = questions.find(q2 => q2.name === 'Role');
                          //set the portfolio to show if its either Enigneer or designer
                          if (roleField) {
                            setConditionalRules(prev => ({
                              ...prev,
                              [q.id]: {
                                logic: 'OR',
                                conditions: [
                                  { questionKey: 'role', operator: 'equals', value: 'Engineer' },
                                  { questionKey: 'role', operator: 'equals', value: 'Designer' }
                                ]
                              }
                            }));
                            alert('Set: Show when Role = Engineer OR Designer');
                          }
                        }}
                        style={styles.quickButton}
                      >
                        Show when Role = Engineer OR Designer
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={loading || !formName || !selected.baseId || !selected.tableId || questions.length === 0}
          style={{
            ...styles.createButton,
            background: (loading || !formName || !selected.baseId || !selected.tableId || questions.length === 0) 
              ? '#ccc' 
              : '#28a745',
            cursor: (loading || !formName || !selected.baseId || !selected.tableId || questions.length === 0) 
              ? 'not-allowed' 
              : 'pointer'
          }}
        >
          {loading ? '⏳ Creating...' : 'CREATE FORM NOW'}
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: 'clamp(15px, 4vw, 20px)',
    width: '100%',
    boxSizing: 'border-box'
  },
  backButton: {
    marginBottom: 'clamp(15px, 3vw, 20px)',
    padding: 'clamp(6px, 1.5vw, 10px) clamp(12px, 3vw, 20px)',
    cursor: 'pointer',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: 'clamp(14px, 3vw, 16px)'
  },
  title: {
    fontSize: 'clamp(20px, 5vw, 24px)',
    marginBottom: 'clamp(15px, 3vw, 20px)'
  },
  formCard: {
    background: 'white',
    padding: 'clamp(15px, 3vw, 25px)',
    border: '1px solid #ddd',
    borderRadius: '8px',
    marginTop: 'clamp(15px, 3vw, 20px)'
  },
  formGroup: {
    marginBottom: 'clamp(12px, 3vw, 20px)'
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontSize: 'clamp(14px, 3vw, 16px)'
  },
  formInput: {
    width: '100%',
    padding: 'clamp(8px, 2vw, 12px)',
    marginTop: '5px',
    border: '1px solid #ccc',
    borderRadius: '6px',
    fontSize: 'clamp(14px, 3vw, 16px)',
    boxSizing: 'border-box'
  },
  fieldsContainer: {
    border: '1px solid #ddd',
    padding: 'clamp(10px, 2vw, 15px)',
    maxHeight: '300px',
    overflowY: 'auto',
    marginTop: '8px',
    background: '#fafafa',
    borderRadius: '6px'
  },
  fieldItem: {
    marginBottom: 'clamp(6px, 1.5vw, 10px)'
  },
  fieldLabel: {
    cursor: 'pointer',
    fontSize: 'clamp(14px, 3vw, 16px)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  checkbox: {
    transform: 'scale(1.2)'
  },
  fieldType: {
    color: '#666',
    fontSize: 'clamp(12px, 2.5vw, 14px)'
  },
  selectedCount: {
    marginTop: 'clamp(8px, 2vw, 12px)',
    padding: 'clamp(8px, 2vw, 12px)',
    background: '#e8f5e9',
    border: '1px solid #4caf50',
    borderRadius: '6px',
    fontSize: 'clamp(14px, 3vw, 16px)'
  },
  conditionalSection: {
    marginTop: 'clamp(20px, 4vw, 30px)',
    padding: 'clamp(12px, 3vw, 20px)',
    background: '#fff3cd',
    border: '2px solid #ffc107',
    borderRadius: '8px'
  },
  conditionalCard: {
    marginTop: 'clamp(15px, 3vw, 25px)',
    padding: 'clamp(12px, 3vw, 20px)',
    background: 'white',
    border: '2px solid #2196f3',
    borderRadius: '8px'
  },
  activeConditions: {
    marginBottom: 'clamp(10px, 2vw, 15px)',
    padding: 'clamp(8px, 2vw, 12px)',
    background: '#d4edda',
    border: '2px solid #28a745',
    borderRadius: '6px'
  },
  conditionsTitle: {
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#155724'
  },
  conditionItem: {
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    marginBottom: '6px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px'
  },
  conditionText: {
    flex: 1,
    minWidth: '200px'
  },
  removeButton: {
    padding: 'clamp(4px, 1vw, 6px) clamp(8px, 2vw, 12px)',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: 'clamp(11px, 2.5vw, 13px)',
    fontWeight: 'bold',
    whiteSpace: 'nowrap'
  },
  conditionalTitle: {
    fontSize: 'clamp(14px, 3vw, 16px)',
    marginBottom: '10px',
    fontWeight: 'bold'
  },
  conditionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 'clamp(8px, 2vw, 12px)',
    alignItems: 'center'
  },
  conditionSelect: {
    padding: 'clamp(8px, 2vw, 12px)',
    border: '2px solid #2196f3',
    fontSize: 'clamp(13px, 2.5vw, 14px)',
    borderRadius: '6px',
    width: '100%',
    boxSizing: 'border-box'
  },
  disabledInput: {
    padding: 'clamp(8px, 2vw, 12px)',
    border: '1px solid #ccc',
    fontSize: 'clamp(13px, 2.5vw, 14px)',
    background: '#f5f5f5',
    borderRadius: '6px',
    width: '100%',
    boxSizing: 'border-box'
  },
  selectInput: {
    padding: 'clamp(6px, 1.5vw, 10px)',
    border: '1px solid #ccc',
    fontSize: 'clamp(13px, 2.5vw, 14px)',
    borderRadius: '6px',
    width: '100%',
    boxSizing: 'border-box'
  },
  textInput: {
    padding: 'clamp(6px, 1.5vw, 10px)',
    border: '1px solid #ccc',
    fontSize: 'clamp(13px, 2.5vw, 14px)',
    borderRadius: '6px',
    width: '100%',
    boxSizing: 'border-box'
  },
  addButton: {
    padding: 'clamp(8px, 2vw, 12px)',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: 'clamp(13px, 2.5vw, 14px)',
    fontWeight: 'bold',
    width: '100%'
  },
  logicSelect: {
    marginTop: 'clamp(10px, 2vw, 15px)'
  },
  logicLabel: {
    fontSize: 'clamp(13px, 2.5vw, 14px)',
    fontWeight: 'bold'
  },
  logicDropdown: {
    padding: '4px',
    fontSize: 'clamp(13px, 2.5vw, 14px)',
    borderRadius: '4px',
    margin: '0 5px'
  },
  quickSetup: {
    marginTop: 'clamp(12px, 3vw, 20px)',
    padding: 'clamp(8px, 2vw, 12px)',
    background: '#e7f3ff',
    borderRadius: '6px'
  },
  quickSetupTitle: {
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    display: 'block',
    marginBottom: '8px'
  },
  quickButton: {
    padding: 'clamp(6px, 1.5vw, 10px) clamp(12px, 2.5vw, 20px)',
    background: '#2196f3',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    fontWeight: 'bold',
    marginTop: '8px',
    width: '100%'
  },
  createButton: {
    width: '100%',
    padding: 'clamp(12px, 3vw, 18px)',
    color: 'white',
    border: 'none',
    marginTop: 'clamp(15px, 3vw, 25px)',
    fontSize: 'clamp(16px, 3.5vw, 18px)',
    fontWeight: 'bold',
    borderRadius: '8px'
  }
};

export default FormBuilder;
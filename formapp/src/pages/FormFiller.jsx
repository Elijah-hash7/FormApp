import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function FormFiller() {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [visibleQuestions, setVisibleQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const shouldShowQuestion = (rules, answersSoFar) => {
    if (!rules) return true;
    const { logic, conditions } = rules;

    if (!conditions || conditions.length === 0) return true;

    const conditionResults = conditions.map(condition => {
      const answer = answersSoFar[condition.questionKey];

      if (answer === undefined || answer === null || answer === '') {
        return false;
      }

      switch (condition.operator) {
        case 'equals':
          return answer.toString() === condition.value.toString();
        case 'notEquals':
          return answer.toString() !== condition.value.toString();
        case 'contains':
          return answer.toString().includes(condition.value.toString());
        default:
          return false;
      }
    });

    return logic === 'AND' 
      ? conditionResults.every(result => result === true)
      : conditionResults.some(result => result === true);
  };

  const recalculateVisibleQuestions = (questions, currentAnswers) => {
    if (!questions) return [];
    return questions.filter(q => {
      if (!q.conditionalRules) return true;
      return shouldShowQuestion(q.conditionalRules, currentAnswers);
    });
  };

  useEffect(() => {
    const loadForm = async () => {
      try {
        setLoading(true);
        const res = await fetch(`http://localhost:5000/api/forms/${formId}`);
        if (!res.ok) throw new Error(`Failed to load form: ${res.status}`);

        const data = await res.json();
        setForm(data);
        const initialVisible = data.questions?.filter(q => !q.conditionalRules || q.conditionalRules.conditions.length === 0);
        setVisibleQuestions(initialVisible);
      } catch (error) {
        console.error('Error loading form:', error);
        alert(`Failed to load form: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    loadForm();
  }, [formId]);

  const handleAnswerChange = (questionKey, value) => {
    const newAnswers = { ...answers, [questionKey]: value };
    setAnswers(newAnswers);
    if (form?.questions) {
      const updatedVisible = recalculateVisibleQuestions(form.questions, newAnswers);
      setVisibleQuestions(updatedVisible);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId, answers })
      });

      const responseText = await res.text();
      if (res.ok) {
        alert('✅ Form submitted!');
        setAnswers({});
        const initialVisible = form?.questions?.filter(q => !q.conditionalRules) || [];
        setVisibleQuestions(initialVisible);
      } else {
        alert(`❌ Error ${res.status}: ${responseText}`);
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert(`❌ Network error: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div>Loading form...</div>
      </div>
    );
  }

  if (!form) {
    return (
      <div style={styles.errorContainer}>
        <div>Form not found</div>
        <button onClick={() => window.location.reload()} style={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{form.name || 'Form'}</h1>
      <form onSubmit={handleSubmit}>
        {visibleQuestions.map(q => (
          <div key={q.questionKey} style={styles.questionCard}>
            <label style={styles.label}>{q.label}</label>
            {(() => {
              switch (q.type) {
                case 'singleSelect':
                  return (
                    <select
                      value={answers[q.questionKey] || ''}
                      onChange={(e) => handleAnswerChange(q.questionKey, e.target.value)}
                      style={styles.select}
                    >
                      <option value="">-- Select an option --</option>
                      {(q.options || []).map((option, index) => (
                        <option key={index} value={option}>{option}</option>
                      ))}
                    </select>
                  );
                case 'multipleAttachments':
                  return (
                    <div>
                      <input
                        type="file"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files);
                          handleAnswerChange(q.questionKey, files);
                        }}
                        style={styles.fileInput}
                      />
                      {answers[q.questionKey] && (
                        <div style={styles.fileCount}>
                          ✓ {answers[q.questionKey].length} file(s) selected
                        </div>
                      )}
                    </div>
                  );
                case 'singleLineText':
                default:
                  return (
                    <input
                      type="text"
                      value={answers[q.questionKey] || ''}
                      onChange={(e) => handleAnswerChange(q.questionKey, e.target.value)}
                      placeholder={`Enter ${q.label.toLowerCase()}...`}
                      style={styles.textInput}
                    />
                  );
              }
            })()}
          </div>
        ))}

        {visibleQuestions.length > 0 ? (
          <button type="submit" style={styles.submitButton}>
            Submit Form
          </button>
        ) : (
          <div style={styles.emptyState}>
            No questions to display. Answer previous questions to see more.
          </div>
        )}
      </form>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    width: '100%',
    boxSizing: 'border-box'
  },
  title: {
    marginBottom: '30px',
    color: '#333',
    fontSize: 'clamp(24px, 5vw, 32px)',
    textAlign: 'center'
  },
  questionCard: {
    marginBottom: '25px',
    padding: 'clamp(12px, 3vw, 20px)',
    background: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '8px'
  },
  label: {
    display: 'block',
    marginBottom: '10px',
    fontWeight: '600',
    color: '#212529',
    fontSize: 'clamp(16px, 4vw, 18px)'
  },
  select: {
    width: '100%',
    padding: 'clamp(10px, 3vw, 14px)',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: 'clamp(14px, 4vw, 16px)',
    boxSizing: 'border-box'
  },
  textInput: {
    width: '100%',
    padding: 'clamp(10px, 3vw, 14px)',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    fontSize: 'clamp(14px, 4vw, 16px)',
    boxSizing: 'border-box'
  },
  fileInput: {
    width: '100%',
    padding: 'clamp(8px, 2vw, 12px)',
    border: '1px solid #ced4da',
    borderRadius: '4px',
    boxSizing: 'border-box'
  },
  fileCount: {
    marginTop: '8px',
    fontSize: 'clamp(12px, 3vw, 14px)',
    color: '#28a745',
    fontWeight: '500'
  },
  submitButton: {
    width: '100%',
    padding: 'clamp(14px, 4vw, 18px)',
    background: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(16px, 4vw, 18px)',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '20px'
  },
  emptyState: {
    textAlign: 'center',
    padding: 'clamp(20px, 5vw, 30px)',
    background: '#f8f9fa',
    border: '1px dashed #dee2e6',
    borderRadius: '8px',
    color: '#6c757d',
    fontSize: 'clamp(14px, 4vw, 16px)'
  },
  loadingContainer: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: 'clamp(30px, 10vw, 40px)',
    textAlign: 'center',
    width: '100%',
    boxSizing: 'border-box'
  },
  errorContainer: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: 'clamp(30px, 10vw, 40px)',
    textAlign: 'center',
    width: '100%',
    boxSizing: 'border-box'
  },
  retryButton: {
    padding: 'clamp(8px, 2vw, 12px) clamp(16px, 4vw, 24px)',
    background: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '15px',
    fontSize: 'clamp(14px, 3vw, 16px)'
  }
};
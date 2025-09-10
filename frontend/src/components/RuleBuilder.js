import React, { useState } from 'react';

const RuleBuilder = ({ rules, onChange }) => {
  const [ruleGroups, setRuleGroups] = useState(rules || []);

  const addRule = () => {
    const newRule = {
      id: Date.now(),
      field: 'totalSpend',
      operator: 'gt',
      value: '',
      logicalOperator: 'AND'
    };
    const updatedRules = [...ruleGroups, newRule];
    setRuleGroups(updatedRules);
    onChange(updatedRules);
  };

  const updateRule = (id, updates) => {
    const updatedRules = ruleGroups.map(rule => 
      rule.id === id ? { ...rule, ...updates } : rule
    );
    setRuleGroups(updatedRules);
    onChange(updatedRules);
  };

  const removeRule = (id) => {
    const updatedRules = ruleGroups.filter(rule => rule.id !== id);
    setRuleGroups(updatedRules);
    onChange(updatedRules);
  };

  const fieldOptions = [
    { value: 'totalSpend', label: 'Total Spend' },
    { value: 'visits', label: 'Number of Visits' },
    { value: 'lastVisit', label: 'Last Visit (days ago)' },
    { value: 'age', label: 'Age' },
  ];

  const operatorOptions = [
    { value: 'gt', label: 'Greater than' },
    { value: 'lt', label: 'Less than' },
    { value: 'eq', label: 'Equal to' },
    { value: 'gte', label: 'Greater than or equal' },
    { value: 'lte', label: 'Less than or equal' },
  ];

  return (
    <div className="rule-builder">
      <h5>Audience Rules</h5>
      
      {ruleGroups.map((rule, index) => (
        <div key={rule.id} className="card mb-3">
          <div className="card-body">
            <div className="row align-items-center">
              {index > 0 && (
                <div className="col-12 mb-2">
                  <select 
                    className="form-select form-select-sm w-auto"
                    value={rule.logicalOperator}
                    onChange={(e) => updateRule(rule.id, { logicalOperator: e.target.value })}
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                </div>
              )}
              
              <div className="col-md-4">
                <select 
                  className="form-select"
                  value={rule.field}
                  onChange={(e) => updateRule(rule.id, { field: e.target.value })}
                >
                  {fieldOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="col-md-3">
                <select 
                  className="form-select"
                  value={rule.operator}
                  onChange={(e) => updateRule(rule.id, { operator: e.target.value })}
                >
                  {operatorOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="col-md-3">
                <input 
                  type="number"
                  className="form-control"
                  placeholder="Value"
                  value={rule.value}
                  onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                />
              </div>
              
              <div className="col-md-2">
                <button 
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => removeRule(rule.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      <button 
        className="btn btn-outline-primary"
        onClick={addRule}
      >
        + Add Rule
      </button>
    </div>
  );
};

export default RuleBuilder;
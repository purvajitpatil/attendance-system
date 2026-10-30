import React from 'react';

const Alert = ({ type = 'danger', message, onClose }) => {
  if (!message) return null;

  return (
    <div className={`alert alert-${type}`} role="alert" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '1.2rem',
            lineHeight: 1,
            cursor: 'pointer',
            padding: '0 4px',
            color: 'inherit',
          }}
          aria-label="Close"
        >
          &times;
        </button>
      )}
    </div>
  );
};

export default Alert;

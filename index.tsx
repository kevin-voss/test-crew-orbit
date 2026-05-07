import React from 'react';
import ReactDOM from 'react-dom/client';

const App: React.FC = () => {
  return (
    <div style={{
      textAlign: 'center',
      padding: '40px 20px',
      borderRadius: '8px',
      backgroundColor: 'white',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    }}>
      <h1 style={{ color: '#333', marginBottom: '10px' }}>Simple Bun React App</h1>
      <p style={{ color: '#666', fontSize: '16px' }}>
        Welcome! This is a simple React application built with Bun.
      </p>
      <div style={{
        marginTop: '20px',
        padding: '20px',
        backgroundColor: '#f9f9f9',
        borderRadius: '4px',
        textAlign: 'left',
        display: 'inline-block',
      }}>
        <h2 style={{ color: '#333', fontSize: '18px' }}>Features:</h2>
        <ul style={{ color: '#666' }}>
          <li>Built with React 18</li>
          <li>Bundled with Bun</li>
          <li>TypeScript support</li>
        </ul>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('app')!);
root.render(<App />);

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// 앱 진입점 - reportWebVitals 제거 (Vite 환경에서 불필요)
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
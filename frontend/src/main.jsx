import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { applyAppTheme } from './lib/app-config';
import './styles.css';

applyAppTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

import React from 'react'
import ReactDOM from 'react-dom/client'
import { inject } from '@vercel/analytics'
import App from './App.jsx'
import './index.css'

// Vercel Web Analytics — the framework-agnostic injector (no React hooks, so it can't
// trip Vite's dev React-dedup). Real data only flows on the deployed *.vercel.app domain.
inject()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)

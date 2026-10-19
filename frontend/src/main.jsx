import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// In development the Vite dev server proxies "/api" to the backend, but there is
// no proxy in production. Point axios at the real backend origin once, here, so
// every relative call such as axios.post("/api/users/login") reaches the API.
// Set VITE_API_URL to the deployed backend URL (no trailing slash), e.g.
// https://maikens-api.onrender.com
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.error(
    'VITE_API_URL is not set. API calls will fall back to http://localhost:5000 ' +
      'and fail. Add VITE_API_URL to your hosting environment variables and redeploy.'
  )
}

axios.defaults.baseURL = API_URL

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

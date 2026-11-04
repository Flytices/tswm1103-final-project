import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'; // <-- 1. Import Toaster
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Toaster position="top-right" reverseOrder={false} /> {/* <-- 2. Add Toaster here */}
    <App />
  </StrictMode>,
)
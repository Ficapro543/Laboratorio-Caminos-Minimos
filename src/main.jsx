import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import DijkstraLab from './DijkstraLab.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DijkstraLab />
  </StrictMode>,
)

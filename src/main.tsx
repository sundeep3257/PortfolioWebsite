import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { startVisualLayoutSync } from './lib/visualLayout'
import './styles.css'

startVisualLayoutSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

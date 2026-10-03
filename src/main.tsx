import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeDiscord } from './discord'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Discord запускаем ПОСЛЕ отображения интерфейса.
// В обычном браузере initializeDiscord() сама пропустит Discord SDK.
initializeDiscord()
  .then((result) => {
    console.log('MEWAY Discord result:', result)
  })
  .catch((error) => {
    console.error('MEWAY Discord startup error:', error)
  })
  
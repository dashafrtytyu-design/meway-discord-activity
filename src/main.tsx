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

// Discord запускаем отдельно.
// Даже если SDK не подключится, MEWAY уже будет отображаться.
initializeDiscord().catch((error) => {
  console.error('MEWAY: Discord SDK не удалось запустить', error)
})

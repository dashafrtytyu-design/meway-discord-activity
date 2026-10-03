import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import {
  initializeDiscord,
  type MewayAuthResult,
} from './discord'

function MewayRoot() {
  const [discordAuth, setDiscordAuth] = useState<MewayAuthResult>({
    connected: false,
    authenticated: false,
    role: null,
    user: null,
  })

  useEffect(() => {
    initializeDiscord()
      .then((result) => {
        console.log('MEWAY Discord result:', result)
        setDiscordAuth(result)
      })
      .catch((error) => {
        console.error('MEWAY Discord startup error:', error)
      })
  }, [])

  return <App discordAuth={discordAuth} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MewayRoot />
  </StrictMode>,
)

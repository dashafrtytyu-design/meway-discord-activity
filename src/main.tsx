import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeDiscord, type MewayAuthResult } from './discord'

const initialAuth: MewayAuthResult = {
  connected: false,
  authenticated: false,
  role: null,
  user: null,
}

function MewayRoot() {
  const [discordAuth, setDiscordAuth] = useState(initialAuth)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    initializeDiscord().then((result) => {
      setDiscordAuth(result)
      setAuthReady(true)
    })
  }, [])

  return <App discordAuth={discordAuth} authReady={authReady} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><MewayRoot /></StrictMode>,
)

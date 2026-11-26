import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import store from './store'
import { seedDemoSession } from './demo/session'
import './index.css'
import 'leaflet/dist/leaflet.css'
import App from './App.jsx'

// Seed the fake session before the first render so App restores a role
// immediately instead of showing a login screen that needs a backend.
seedDemoSession()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)

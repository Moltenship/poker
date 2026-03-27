import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { SessionProvider } from '@/providers/SessionProvider'
import router from './router'
import './index.css'

// ConvexProvider placeholder for future integration
const App = () => (
  <SessionProvider>
    <RouterProvider router={router} />
  </SessionProvider>
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

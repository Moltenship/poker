import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { RouterProvider } from 'react-router-dom'
import { SessionProvider } from '@/providers/SessionProvider'
import router from './router'
import './index.css'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

const App = () => (
  <ConvexProvider client={convex}>
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  </ConvexProvider>
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

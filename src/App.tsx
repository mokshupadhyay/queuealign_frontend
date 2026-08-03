import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CreateEvent } from './pages/CreateEvent'
import { Desk } from './pages/Desk'
import { Display } from './pages/Display'
import { Landing } from './pages/Landing'
import { Register } from './pages/Register'
import { Ticket } from './pages/Ticket'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/create" element={<CreateEvent />} />
        <Route path="/e/:slug" element={<Register />} />
        <Route path="/e/:slug/t/:token" element={<Ticket />} />
        <Route path="/e/:slug/desk" element={<Desk />} />
        <Route path="/e/:slug/display" element={<Display />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Roadmap } from './pages/Roadmap'
import { LevelPage } from './pages/LevelPage'
import { Lab, VizPage } from './pages/Lab'
import { Review, Exam } from './pages/Review'
import { Checklist } from './pages/Checklist'
import { Settings } from './pages/Settings'
import { NotFound } from './pages/NotFound'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="level/:slug" element={<LevelPage />} />
          <Route path="lab" element={<Lab />} />
          <Route path="lab/:id" element={<VizPage />} />
          <Route path="review" element={<Review />} />
          <Route path="exam" element={<Exam />} />
          <Route path="checklist" element={<Checklist />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)

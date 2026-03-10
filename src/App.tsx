import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import AuthRedirect from '@/components/shared/AuthRedirect'
import SignInPage from '@/pages/auth/SignInPage'
import SignUpPage from '@/pages/auth/SignUpPage'
import RoleSelection from '@/pages/onboarding/RoleSelection'
import CaregiverOnboarding from '@/pages/onboarding/CaregiverOnboarding'
import SeniorOnboarding from '@/pages/onboarding/SeniorOnboarding'
import SeniorHome from '@/pages/senior/SeniorHome'
import MyDay from '@/pages/senior/MyDay'
import CaregiverDashboard from '@/pages/caregiver/CaregiverDashboard'
import HealthTimeline from '@/pages/caregiver/HealthTimeline'
import VibeCheck from '@/pages/caregiver/VibeCheck'
import AnomalyAlerts from '@/pages/caregiver/AnomalyAlerts'
import Reminders from '@/pages/caregiver/Reminders'
import FamilyMessages from '@/pages/caregiver/FamilyMessages'
import MemoryBook from '@/pages/caregiver/MemoryBook'
import DigestSettings from '@/pages/caregiver/DigestSettings'

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<AuthRedirect />} />
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />

      {/* Onboarding routes (auth required but no onboarding check) */}
      <Route path="/onboarding" element={<RoleSelection />} />
      <Route path="/onboarding/caregiver" element={<CaregiverOnboarding />} />
      <Route path="/onboarding/senior" element={<SeniorOnboarding />} />

      {/* Protected senior routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/senior/home" element={<SeniorHome />} />
        <Route path="/senior/my-day" element={<MyDay />} />
      </Route>

      {/* Protected caregiver routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/caregiver/dashboard" element={<CaregiverDashboard />} />
        <Route path="/caregiver/health" element={<HealthTimeline />} />
        <Route path="/caregiver/vibe-check" element={<VibeCheck />} />
        <Route path="/caregiver/alerts" element={<AnomalyAlerts />} />
        <Route path="/caregiver/reminders" element={<Reminders />} />
        <Route path="/caregiver/messages" element={<FamilyMessages />} />
        <Route path="/caregiver/memories" element={<MemoryBook />} />
        <Route path="/caregiver/settings" element={<DigestSettings />} />
      </Route>
    </Routes>
  )
}

export default App

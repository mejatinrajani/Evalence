import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Layout } from './components/Layout'
import { DashboardLayout } from './components/DashboardLayout'
import LandingPage from './pages/LandingPage'
import PrivacyPolicy from './pages/PrivacyPolicy'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import VerifyOtp from './pages/auth/VerifyOtp'
import OrganizerDashboard from './pages/dashboard/OrganizerDashboard'
import CreateEvent from './pages/dashboard/mentor/CreateEvent'
import JudgeDashboard from './pages/dashboard/JudgeDashboard'
import ParticipantDashboard from './pages/dashboard/ParticipantDashboard'
import ProfileSettings from './pages/dashboard/ProfileSettings'
import MyHackathons from './pages/dashboard/MyHackathons'
import HackathonDetail from './pages/dashboard/HackathonDetail'
import Leaderboard from './pages/Leaderboard'
import EventsDiscovery from './pages/EventsDiscovery'
// Judge Portal Components
import { EvaluationsPage, MyRatingsPage, JudgeStatsPage } from './components/judge'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        expand={true}
        richColors
        toastOptions={{
          style: {
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: '14px',
            borderRadius: '12px',
          },
        }}
      />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/verify-otp" element={<VerifyOtp />} />
          <Route path="/events" element={<EventsDiscovery />} />
          <Route path="/leaderboard/:id" element={<Leaderboard />} />
        </Route>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard/organizer" element={<OrganizerDashboard />} />
          <Route path="/dashboard/mentor/create" element={<CreateEvent />} />
          <Route path="/dashboard/judge" element={<JudgeDashboard />} />
          <Route path="/dashboard/participant" element={<ParticipantDashboard />} />
          <Route path="/dashboard/profile" element={<ProfileSettings />} />
          <Route path="/organizer" element={<MyHackathons />} />
          <Route path="/organizer/hackathons/:hackathonId" element={<HackathonDetail />} />
          {/* Judge Portal Routes */}
          <Route path="/judge" element={<JudgeDashboard />} />
          <Route path="/judge/evaluations" element={<EvaluationsPage />} />
          <Route path="/judge/history" element={<MyRatingsPage />} />
          <Route path="/judge/progress" element={<JudgeStatsPage />} />
          {/* Phase 3 routes disabled - requires additional dependencies */}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

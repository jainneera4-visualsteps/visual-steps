import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WalkthroughProvider } from './context/WalkthroughContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { KidProtectedRoute } from './components/KidProtectedRoute';
import Home from './pages/Home';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import EmailConfirmed from './pages/EmailConfirmed';
import Dashboard from './pages/Dashboard';
import ProgressReport from './pages/ProgressReport';
import SummaryReport from './pages/SummaryReport';
import AddEditKid from './pages/AddEditKid';
import Profile from './pages/Profile';
import AssignedActivities from './pages/AssignedActivities';
import KidsDashboard from './pages/KidsDashboard';
import SocialStories from './pages/SocialStories';
import CreateSocialStory from './pages/CreateSocialStory';
import ViewSocialStory from './pages/ViewSocialStory';
import WorksheetGenerator from './pages/WorksheetGenerator';
import SavedWorksheets from './pages/SavedWorksheets';
import QuizGenerator from './pages/QuizGenerator';
import SavedQuizzes from './pages/SavedQuizzes';
import PlayQuiz from './pages/PlayQuiz';
import EditQuiz from './pages/EditQuiz';
import ActivityLibrary from './pages/ActivityLibrary';
import About from './pages/About';
import Pricing from './pages/Pricing';
import GuestDemo from './pages/GuestDemo';
import Testimonials from './pages/Testimonials';
import Contact from './pages/Contact';
import Newsletter from './pages/Newsletter';
import NewsletterAdmin from './pages/NewsletterAdmin';
import AdminInsights from './pages/AdminInsights';
import SupportInbox from './pages/SupportInbox';
import FeatureDetail from './pages/FeatureDetail';
import DataManagement from './pages/DataManagement';
import Legal from './pages/Legal';
import DemoWatch from './pages/DemoWatch';
import { NetworkStatusBanner } from './components/NetworkStatusBanner';
import { GuestWorkspace } from './components/GuestWorkspace';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WalkthroughProvider>
          <NetworkStatusBanner />
          <GuestWorkspace />
          <Routes>
          <Route path="/watch" element={<DemoWatch />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Home />} />
            <Route path="signup" element={<Signup />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="auth/confirmed" element={<EmailConfirmed />} />
            <Route path="about" element={<About />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="demo" element={<GuestDemo />} />
            <Route path="guest" element={<GuestDemo />} />
            <Route path="testimonials" element={<Testimonials />} />
            <Route path="contact" element={<Contact />} />
            <Route path="privacy" element={<Legal kind="privacy" />} />
            <Route path="terms" element={<Legal kind="terms" />} />
            <Route path="cookies" element={<Legal kind="cookies" />} />
            <Route path="newsletter" element={<Newsletter />} />
            <Route path="newsletter/subscribe" element={<Newsletter />} />
            <Route path="newsletter/community" element={<Newsletter />} />
            <Route path="newsletter/archive/:month" element={<Newsletter />} />
            <Route path="newsletter/issues/:issueDate" element={<Newsletter />} />
            <Route path="features/:featureId" element={<FeatureDetail />} />
            
            <Route element={<ProtectedRoute />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="progress-report/:kidId" element={<ProgressReport />} />
              <Route path="summary-report/:kidId" element={<SummaryReport />} />
              <Route path="add-kid" element={<AddEditKid />} />
              <Route path="edit-kid/:id" element={<AddEditKid />} />
              <Route path="assigned-activities/:kidId" element={<AssignedActivities />} />
              <Route path="profile" element={<Profile />} />
              <Route path="data-management" element={<DataManagement />} />
              <Route path="social-stories" element={<SocialStories />} />
              <Route path="social-stories/create" element={<CreateSocialStory />} />
              <Route path="social-stories/edit/:id" element={<CreateSocialStory />} />
              <Route path="worksheet-generator" element={<WorksheetGenerator />} />
              <Route path="saved-worksheets" element={<SavedWorksheets />} />
              <Route path="quiz-generator" element={<QuizGenerator />} />
              <Route path="saved-quizzes" element={<SavedQuizzes />} />
              <Route path="play-quiz/:id" element={<PlayQuiz />} />
              <Route path="edit-quiz/:id" element={<EditQuiz />} />
              <Route path="activity-library" element={<ActivityLibrary />} />
              <Route path="newsletter-admin" element={<NewsletterAdmin />} />
              <Route path="admin/insights" element={<AdminInsights />} />
              <Route path="admin/support" element={<SupportInbox />} />
            </Route>
            <Route path="social-stories/view/:id" element={<ViewSocialStory />} />
            <Route path="social-stories/shared/:shareToken" element={<ViewSocialStory />} />
          </Route>
          
          <Route element={<KidProtectedRoute />}>
            <Route path="/kids-dashboard/:kidId" element={<KidsDashboard />} />
            <Route path="/play-quiz/:id/:kidId" element={<PlayQuiz />} />
          </Route>
        </Routes>
        </WalkthroughProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

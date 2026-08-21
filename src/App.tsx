import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WalkthroughProvider } from './context/WalkthroughContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { KidProtectedRoute } from './components/KidProtectedRoute';
import Home from './pages/Home';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
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
import { NetworkStatusBanner } from './components/NetworkStatusBanner';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WalkthroughProvider>
          <NetworkStatusBanner />
          <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Home />} />
            <Route path="signup" element={<Signup />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="about" element={<About />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="demo" element={<GuestDemo />} />
            
            <Route element={<ProtectedRoute />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="progress-report/:kidId" element={<ProgressReport />} />
              <Route path="summary-report/:kidId" element={<SummaryReport />} />
              <Route path="add-kid" element={<AddEditKid />} />
              <Route path="edit-kid/:id" element={<AddEditKid />} />
              <Route path="assigned-activities/:kidId" element={<AssignedActivities />} />
              <Route path="profile" element={<Profile />} />
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

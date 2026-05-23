import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout/Layout';
import HomePage from './pages/Home/HomePage';
import WallPage from './pages/Wall/WallPage';
import AdvisorPage from './pages/Advisor/AdvisorPage';
import CommunityPage from './pages/Community/CommunityPage';
import ProfilePage from './pages/Profile/ProfilePage';
import AuthPage from './pages/Auth/AuthPage';
import { useAuthStore } from './stores/authStore';

export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/wall" element={<WallPage />} />
          <Route path="/advisor" element={<AdvisorPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/me" element={<ProfilePage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ScamChecker } from './components/ScamChecker';
import { Education } from './components/Education';
import { Quiz } from './components/Quiz';
import { Footer } from './components/Footer';
import { NotFound } from './pages/NotFound';

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveSection = () => {
    const path = location.pathname;
    if (path === '/checker') return 'checker';
    if (path === '/learn') return 'learn';
    if (path === '/quiz') return 'quiz';
    return 'home';
  };

  const setActiveSection = (section: string) => {
    const routes: Record<string, string> = {
      home: '/',
      checker: '/checker',
      learn: '/learn',
      quiz: '/quiz',
    };
    navigate(routes[section] || '/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        activeSection={getActiveSection()} 
        setActiveSection={setActiveSection} 
      />
      
      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={<Hero setActiveSection={setActiveSection} />} />
          <Route path="/checker" element={<ScamChecker />} />
          <Route path="/learn" element={<Education />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
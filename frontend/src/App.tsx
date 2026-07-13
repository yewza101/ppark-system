const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import Home from './pages/Home';
import Attendance from './pages/Attendance';
import AdminDashboard from './pages/AdminDashboard';
import ParentPortal from './pages/ParentPortal';

const queryClient = new QueryClient();

function Layout({ children }: { children: React.ReactNode }) {
  const [clickCount, setClickCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(!!localStorage.getItem('adminToken'));
  const navigate = useNavigate();

  const handleLogoClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    if (newCount === 5) {
      setClickCount(0);
      const password = prompt("Admin Password:");
      if (password) {
        fetch(`${API_URL}/api/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        })
        .then(res => res.json())
        .then(data => {
          if (data.token) {
            localStorage.setItem('adminToken', data.token);
            setIsAdmin(true);
            navigate('/admin');
          } else {
            alert("Invalid password");
          }
        });
      }
    }
    
    setTimeout(() => {
      setClickCount(0);
    }, 3000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div 
              onClick={handleLogoClick}
              className="text-2xl font-bold text-brand-400 cursor-pointer select-none"
            >
              PastelTutor
            </div>
            {isAdmin && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-bold border border-purple-200 shadow-sm">👑 Admin Mode</span>}
          </div>
          <nav className="flex items-center space-x-4">
            <Link to="/" className="text-gray-600 hover:text-brand-500 font-medium">ตารางเรียน</Link>
            <Link to="/parent" className="text-gray-600 hover:text-brand-500 font-medium">ผู้ปกครอง</Link>
            {isAdmin && (
              <>
                <div className="w-px h-5 bg-gray-300"></div>
                <Link to="/admin" className="text-brand-500 hover:text-brand-600 font-bold">แผงควบคุมแอดมิน</Link>
                <button 
                  onClick={() => {
                    localStorage.removeItem('adminToken');
                    setIsAdmin(false);
                    navigate('/');
                    window.location.reload(); // force reload to update isAdmin in Home.tsx
                  }}
                  className="text-red-500 hover:bg-red-50 text-sm font-medium border border-red-200 px-3 py-1 rounded-full transition-colors"
                >
                  ออกจากระบบ
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/attendance/:classId" element={<Attendance />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/parent" element={<ParentPortal />} />
          </Routes>
        </Layout>
      </Router>
    </QueryClientProvider>
  );
}

export default App;

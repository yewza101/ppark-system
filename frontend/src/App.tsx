const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, Suspense, lazy } from 'react';
import { Toaster, toast } from 'react-hot-toast';

const Home = lazy(() => import('./pages/Home'));
const Attendance = lazy(() => import('./pages/Attendance'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ParentPortal = lazy(() => import('./pages/ParentPortal'));

// Optimize QueryClient to prevent excessive network requests
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function LoadingSkeleton() {
  return (
    <div className="w-full h-64 flex flex-col items-center justify-center gap-4 animate-pulse">
      <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-400 rounded-full animate-spin"></div>
      <div className="text-gray-400 font-medium">กำลังโหลดข้อมูล...</div>
    </div>
  );
}

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
        const loadingToast = toast.loading('กำลังตรวจสอบ...');
        fetch(`${API_URL}/api/admin/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        })
        .then(res => res.json())
        .then(data => {
          toast.dismiss(loadingToast);
          if (data.token) {
            localStorage.setItem('adminToken', data.token);
            setIsAdmin(true);
            toast.success('เข้าสู่ระบบแอดมินสำเร็จ');
            navigate('/admin');
          } else {
            toast.error("รหัสผ่านไม่ถูกต้อง");
          }
        })
        .catch(() => {
          toast.dismiss(loadingToast);
          toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
        });
      }
    }
    
    setTimeout(() => {
      setClickCount(0);
    }, 3000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster position="top-center" />
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
            <Link to="/parent/login" className="text-gray-600 hover:text-brand-500 font-medium">ผู้ปกครอง</Link>
            {isAdmin && (
              <>
                <div className="w-px h-5 bg-gray-300"></div>
                <Link to="/admin" className="text-brand-500 hover:text-brand-600 font-bold">แผงควบคุม</Link>
                <button 
                  onClick={() => {
                    localStorage.removeItem('adminToken');
                    setIsAdmin(false);
                    toast.success('ออกจากระบบแล้ว');
                    navigate('/');
                    window.location.reload();
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
        <Suspense fallback={<LoadingSkeleton />}>
          {children}
        </Suspense>
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
            <Route path="/attendance/:classId/:date" element={<Attendance />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/parent/login" element={<ParentPortal />} />
          </Routes>
        </Layout>
      </Router>
    </QueryClientProvider>
  );
}

export default App;

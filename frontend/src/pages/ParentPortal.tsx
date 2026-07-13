const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

export default function ParentPortal() {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('parentToken') || '');

  const { data: students } = useQuery({
    queryKey: ['studentsNames'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/students/names`);
      return res.json();
    }
  });

  const { data: summary, isLoading } = useQuery({
    queryKey: ['parentSummary', token],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/parent/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('parentToken');
          setToken('');
        }
        throw new Error('Failed to fetch summary');
      }
      return res.json();
    },
    enabled: !!token,
    retry: false
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/api/parent/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, password })
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('parentToken', data.token);
      setToken(data.token);
      toast.success('เข้าสู่ระบบสำเร็จ');
    } else {
      toast.error(data.error || 'Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('parentToken');
    setToken('');
  };

  const [feedback, setFeedback] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('');

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    
    setFeedbackStatus('sending');
    try {
      const res = await fetch(`${API_URL}/api/parent/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: feedback })
      });
      
      if (!res.ok) throw new Error('Failed to send');
      
      setFeedbackStatus('success');
      setFeedback('');
      setTimeout(() => setFeedbackStatus(''), 3000);
    } catch (err) {
      setFeedbackStatus('error');
      setTimeout(() => setFeedbackStatus(''), 3000);
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">ผู้ปกครองเข้าสู่ระบบ</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อนักเรียน</label>
            <select 
              value={studentId} 
              onChange={e => setStudentId(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-400"
            >
              <option value="">เลือกนักเรียน...</option>
              {students?.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
            <input 
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-brand-400"
            />
          </div>
          <button type="submit" className="w-full bg-brand-400 hover:bg-brand-500 text-gray-900 font-semibold py-2 rounded-lg transition-colors">
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    );
  }


  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800">ข้อมูลนักเรียน</h1>
        <button onClick={logout} className="text-red-500 hover:text-red-700 font-medium">ออกจากระบบ</button>
      </div>
      
      {isLoading ? (
        <div className="text-center py-10">กำลังโหลด...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-50 p-6 rounded-xl shadow-sm border border-red-100">
              <div className="text-red-800 font-semibold mb-2">ยอดค้างชำระรวม</div>
              <div className="text-4xl font-bold text-red-600">{summary?.totalUnpaid || 0} บาท</div>
            </div>
            <div className="bg-green-50 p-6 rounded-xl shadow-sm border border-green-100">
              <div className="text-green-800 font-semibold mb-2">เข้าเรียนไปแล้ว</div>
              <div className="text-4xl font-bold text-green-600">{summary?.totalSessionsAttended || 0} ครั้ง</div>
            </div>
          </div>

          {/* Unpaid History Table */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-red-500">📄</span> ประวัติค้างชำระ
            </h2>
            
            {(!summary?.monthlyBills?.length && !summary?.unpaidSessions?.length) ? (
              <div className="text-center text-gray-500 py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                ไม่มีรายการค้างชำระในขณะนี้
              </div>
            ) : (
              <div className="overflow-hidden border border-gray-100 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 text-sm">
                      <th className="p-3 border-b font-semibold">รายการ</th>
                      <th className="p-3 border-b font-semibold">รายละเอียด / วันที่</th>
                      <th className="p-3 border-b font-semibold text-right">ยอดเงิน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Monthly Bills */}
                    {summary?.monthlyBills?.map((bill: any) => (
                      <tr key={`mb-${bill.id}`} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="p-3">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">รายเดือน</span>
                        </td>
                        <td className="p-3 text-gray-700">รอบบิล {new Date(bill.billing_month).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}</td>
                        <td className="p-3 text-right font-medium text-red-600">{bill.amount} ฿</td>
                      </tr>
                    ))}
                    
                    {/* Per-session Unpaid */}
                    {summary?.unpaidSessions?.map((session: any) => (
                      <tr key={`sess-${session.id}`} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="p-3">
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-semibold">รายครั้ง</span>
                        </td>
                        <td className="p-3 text-gray-700">
                          {session.class_sessions?.classes?.name || 'คลาสเรียน'}
                          <span className="text-sm text-gray-500 ml-2">({new Date(session.class_sessions?.session_date).toLocaleDateString('th-TH')})</span>
                        </td>
                        <td className="p-3 text-right font-medium text-red-600">{session.amount_charged} ฿</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4">ส่งฟีดแบคถึงครู</h2>
            <form onSubmit={submitFeedback}>
              <textarea 
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:border-brand-400 min-h-[100px] mb-3 transition-colors"
                placeholder="พิมพ์ข้อความที่นี่..."
                required
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                disabled={feedbackStatus === 'sending'}
              ></textarea>
              <div className="flex items-center gap-3">
                <button 
                  type="submit" 
                  disabled={feedbackStatus === 'sending'}
                  className="bg-brand-400 hover:bg-brand-500 px-6 py-2 rounded-lg font-semibold text-gray-900 transition-colors disabled:opacity-50"
                >
                  {feedbackStatus === 'sending' ? 'กำลังส่ง...' : 'ส่งข้อความ'}
                </button>
                {feedbackStatus === 'success' && <span className="text-green-600 text-sm font-medium">ส่งข้อความเรียบร้อยแล้ว!</span>}
                {feedbackStatus === 'error' && <span className="text-red-600 text-sm font-medium">เกิดข้อผิดพลาด กรุณาลองใหม่</span>}
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

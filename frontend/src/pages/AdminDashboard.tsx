const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Trash2, Edit2, Users, Save, X, Globe, Home } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AdminDashboard() {
  const location = useLocation();
  const token = localStorage.getItem('adminToken');
  const [activeTab, setActiveTab] = useState<'students' | 'classes' | 'billing' | 'feedback'>('students');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (location.state && location.state.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  // --- Students State ---
  const [studentForm, setStudentForm] = useState({ id: '', name: '', billing_type: 'monthly', default_amount: 0, parent_password: '' });
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [isEditingStudent, setIsEditingStudent] = useState(false);

  // --- Classes State ---
  const [classForm, setClassForm] = useState({ id: '', name: '', day_of_week: 1, start_time: '10:00', end_time: '12:00', location: 'online', color: '#FDE2E4' });
  const [showClassForm, setShowClassForm] = useState(false);
  const [isEditingClass, setIsEditingClass] = useState(false);

  // --- Enrollment State ---
  const [selectedClassForEnrollment, setSelectedClassForEnrollment] = useState<any>(null);
  const [newEnrollment, setNewEnrollment] = useState({ student_id: '', billing_type: 'monthly', amount: 0 });

  // --- Billing State ---
  const [billingMonth, setBillingMonth] = useState(new Date().toISOString().slice(0, 7));

  // --- Queries ---
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['adminStudents'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/admin/students`, { headers: { 'Authorization': `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!token
  });

  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ['adminClasses'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/admin/classes`, { headers: { 'Authorization': `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!token && activeTab === 'classes'
  });

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['classEnrollments', selectedClassForEnrollment?.id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/sessions/${selectedClassForEnrollment.id}/${new Date().toISOString().split('T')[0]}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      return data.attendance || []; // Using the session endpoint logic which returns all enrollments as attendance list
    },
    enabled: !!token && !!selectedClassForEnrollment
  });

  const { data: monthlyBills, isLoading: billsLoading } = useQuery({
    queryKey: ['monthlyBills', billingMonth],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/admin/monthly-billing?from=${billingMonth}&to=${billingMonth}`, { headers: { 'Authorization': `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!token && activeTab === 'billing'
  });

  const { data: feedbacks, isLoading: feedbacksLoading } = useQuery({
    queryKey: ['adminFeedback'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/admin/feedback`, { headers: { 'Authorization': `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!token && activeTab === 'feedback'
  });

  // --- Mutations: Students ---
  const saveStudentMutation = useMutation({
    mutationFn: async (student: any) => {
      const method = isEditingStudent ? 'PATCH' : 'POST';
      const url = isEditingStudent ? `${API_URL}/api/admin/students/${student.id}` : `${API_URL}/api/admin/students`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(student)
      });
      if (!res.ok) throw new Error('Failed to save student');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminStudents'] });
      resetStudentForm();
    }
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/api/admin/students/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to delete student');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminStudents'] })
  });

  // --- Mutations: Classes ---
  const saveClassMutation = useMutation({
    mutationFn: async (cls: any) => {
      const method = isEditingClass ? 'PATCH' : 'POST';
      const url = isEditingClass ? `${API_URL}/api/admin/classes/${cls.id}` : `${API_URL}/api/admin/classes`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(cls)
      });
      if (!res.ok) throw new Error('Failed to save class');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminClasses'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      resetClassForm();
    }
  });

  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/api/admin/classes/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to delete class');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminClasses'] })
  });

  // --- Mutations: Enrollments ---
  const enrollStudentMutation = useMutation({
    mutationFn: async (enrollment: any) => {
      const res = await fetch(`${API_URL}/api/admin/classes/${selectedClassForEnrollment.id}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(enrollment)
      });
      if (!res.ok) throw new Error('Failed to enroll student');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classEnrollments', selectedClassForEnrollment?.id] });
      setNewEnrollment({ student_id: '', billing_type: 'monthly', amount: 0 });
    }
  });

  const unenrollStudentMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const res = await fetch(`${API_URL}/api/admin/enrollments/${enrollmentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to unenroll student');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classEnrollments', selectedClassForEnrollment?.id] });
    }
  });

  // --- Mutations: Billing ---
  const generateBillMutation = useMutation({
    mutationFn: async ({ student_id, amount }: { student_id: string, amount: number }) => {
      const res = await fetch(`${API_URL}/api/admin/monthly-billing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ student_id, billing_month: billingMonth, amount: amount || 0, is_paid: false })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate bill');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBills', billingMonth] });
      toast.success('สร้างบิลสำเร็จ');
    },
    onError: (err: any) => toast.error(`เกิดข้อผิดพลาดในการสร้างบิล: ${err.message}`)
  });

  const payBillMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/api/admin/monthly-billing/${id}/mark-paid`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to pay bill');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyBills', billingMonth] });
      toast.success('รับชำระเงินเรียบร้อย');
    },
    onError: (err: any) => toast.error(`เกิดข้อผิดพลาดในการชำระเงิน: ${err.message}`)
  });

  // --- Handlers ---
  const resetStudentForm = () => {
    setShowStudentForm(false);
    setIsEditingStudent(false);
    setStudentForm({ id: '', name: '', billing_type: 'monthly', default_amount: 0, parent_password: '' });
  };

  const handleEditStudent = (student: any) => {
    setStudentForm({ id: student.id, name: student.name, billing_type: student.billing_type, default_amount: student.default_amount, parent_password: '' });
    setIsEditingStudent(true);
    setShowStudentForm(true);
  };

  const handleDeleteStudent = (id: string) => {
    if (confirm('ยืนยันการลบนักเรียน? (การลบจะลบข้อมูลที่เกี่ยวข้องทั้งหมด)')) {
      deleteStudentMutation.mutate(id);
    }
  };

  const resetClassForm = () => {
    setShowClassForm(false);
    setIsEditingClass(false);
    setClassForm({ id: '', name: '', day_of_week: 1, start_time: '10:00', end_time: '12:00', location: 'online', color: '#FDE2E4' });
  };

  const handleEditClass = (cls: any) => {
    setClassForm({ id: cls.id, name: cls.name, day_of_week: cls.day_of_week, start_time: cls.start_time, end_time: cls.end_time, location: cls.location, color: cls.color });
    setIsEditingClass(true);
    setShowClassForm(true);
  };

  const handleDeleteClass = (id: string) => {
    if (confirm('ยืนยันการลบชั้นเรียน?')) {
      deleteClassMutation.mutate(id);
    }
  };

  if (!token) return <div className="text-center mt-10 text-red-500 font-semibold text-lg">⚠️ คุณยังไม่ได้เข้าสู่ระบบแอดมิน</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[600px] overflow-hidden flex flex-col md:flex-row">
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-gray-50 p-4 border-r border-gray-100 flex flex-col space-y-2">
        <button onClick={() => setActiveTab('students')} className={`p-3 text-left rounded-lg transition-colors font-medium ${activeTab === 'students' ? 'bg-brand-400 text-gray-900 shadow-sm' : 'hover:bg-gray-200 text-gray-700'}`}>จัดการนักเรียน</button>
        <button onClick={() => setActiveTab('classes')} className={`p-3 text-left rounded-lg transition-colors font-medium ${activeTab === 'classes' ? 'bg-brand-400 text-gray-900 shadow-sm' : 'hover:bg-gray-200 text-gray-700'}`}>จัดการชั้นเรียน</button>
        <button onClick={() => setActiveTab('billing')} className={`p-3 text-left rounded-lg transition-colors font-medium ${activeTab === 'billing' ? 'bg-brand-400 text-gray-900 shadow-sm' : 'hover:bg-gray-200 text-gray-700'}`}>ระบบรายเดือน</button>
        <button onClick={() => setActiveTab('feedback')} className={`p-3 text-left rounded-lg transition-colors font-medium ${activeTab === 'feedback' ? 'bg-brand-400 text-gray-900 shadow-sm' : 'hover:bg-gray-200 text-gray-700'}`}>ฟีดแบคจากผู้ปกครอง</button>
      </div>
      
      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        
        {/* STUDENTS TAB */}
        {activeTab === 'students' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">จัดการนักเรียน</h2>
              <button onClick={() => { resetStudentForm(); setShowStudentForm(true); }} className="bg-brand-400 hover:bg-brand-500 px-4 py-2 rounded-lg font-semibold text-gray-900 transition-colors shadow-sm">
                + เพิ่มนักเรียน
              </button>
            </div>

            {showStudentForm && (
              <div className="bg-gray-50 p-5 rounded-xl mb-6 border border-gray-200 shadow-sm">
                <h3 className="font-semibold text-lg mb-3">{isEditingStudent ? 'แก้ไขข้อมูลนักเรียน' : 'เพิ่มนักเรียนใหม่'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">ชื่อ-นามสกุล</label>
                    <input type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-brand-400 outline-none" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">รูปแบบการชำระเงิน (เริ่มต้น)</label>
                    <select className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-brand-400 outline-none" value={studentForm.billing_type} onChange={e => setStudentForm({...studentForm, billing_type: e.target.value})}>
                      <option value="monthly">รายเดือน</option>
                      <option value="per_session">รายครั้ง</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">ค่าเรียน (บาท)</label>
                    <input type="number" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-brand-400 outline-none" value={studentForm.default_amount} onChange={e => setStudentForm({...studentForm, default_amount: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">รหัสผ่านผู้ปกครอง {isEditingStudent && <span className="text-xs text-gray-400">(เว้นว่างถ้าไม่เปลี่ยน)</span>}</label>
                    <input type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-brand-400 outline-none" value={studentForm.parent_password} onChange={e => setStudentForm({...studentForm, parent_password: e.target.value})} placeholder={isEditingStudent ? "****" : "ตั้งรหัสผ่าน"} />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => saveStudentMutation.mutate(studentForm)} className="bg-green-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-600 transition-colors shadow-sm">บันทึก</button>
                  <button onClick={resetStudentForm} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors">ยกเลิก</button>
                </div>
              </div>
            )}

            <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead><tr className="bg-gray-100 text-gray-600"><th className="p-3 border-b font-semibold">ชื่อ</th><th className="p-3 border-b font-semibold">ประเภท</th><th className="p-3 border-b font-semibold">จำนวนเงิน(ค่าเริ่มต้น)</th><th className="p-3 border-b font-semibold text-right">จัดการ</th></tr></thead>
                <tbody>
                  {studentsLoading ? <tr><td colSpan={4} className="p-4 text-center">กำลังโหลด...</td></tr> : students?.map((s: any) => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-800">{s.name}</td>
                      <td className="p-3">{s.billing_type === 'monthly' ? <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">รายเดือน</span> : <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">รายครั้ง</span>}</td>
                      <td className="p-3">{s.default_amount} บาท</td>
                      <td className="p-3 text-right">
                        <button onClick={() => handleEditStudent(s)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors inline-block" title="แก้ไข"><Edit2 size={18} /></button>
                        <button onClick={() => handleDeleteStudent(s.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors inline-block ml-1" title="ลบ"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* CLASSES TAB */}
        {activeTab === 'classes' && (
          <div>
            {!selectedClassForEnrollment ? (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">จัดการชั้นเรียน</h2>
                  <button onClick={() => { resetClassForm(); setShowClassForm(true); }} className="bg-brand-400 hover:bg-brand-500 text-gray-900 px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm">
                    + เพิ่มชั้นเรียน
                  </button>
                </div>

                {showClassForm && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                      <div className="flex justify-between items-center p-5">
                        <h3 className="font-bold text-xl text-purple-700 flex items-center gap-2">
                          <span className="text-2xl">+</span> {isEditingClass ? 'แก้ไขคาบเรียน' : 'เพิ่มคาบเรียนใหม่'}
                        </h3>
                        <button onClick={resetClassForm} className="text-purple-400 hover:text-purple-600 transition-colors">
                          <X size={24} />
                        </button>
                      </div>
                      
                      <div className="p-5 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อห้องเรียน / วิชา</label>
                          <input type="text" className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-300 focus:border-purple-300 outline-none transition-all placeholder-gray-400" placeholder="เช่น ม.3 คณิตฯ" value={classForm.name} onChange={e => setClassForm({...classForm, name: e.target.value})} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">วัน</label>
                            <select className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none bg-white" value={classForm.day_of_week} onChange={e => setClassForm({...classForm, day_of_week: Number(e.target.value)})}>
                              <option value={1}>จันทร์</option><option value={2}>อังคาร</option><option value={3}>พุธ</option><option value={4}>พฤหัสบดี</option><option value={5}>ศุกร์</option><option value={6}>เสาร์</option><option value={0}>อาทิตย์</option>
                            </select>
                          </div>
                          <div>
                            {/* Empty space matching the mockup layout for 'แบบตาราง' */}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">เวลาเริ่ม</label>
                            <input type="time" className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none" value={classForm.start_time} onChange={e => setClassForm({...classForm, start_time: e.target.value})} />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">เวลาเลิก</label>
                            <input type="time" className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none" value={classForm.end_time} onChange={e => setClassForm({...classForm, end_time: e.target.value})} />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">รูปแบบการเรียน</label>
                          <div className="flex gap-3">
                            <button 
                              onClick={() => setClassForm({...classForm, location: 'online'})}
                              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${classForm.location === 'online' ? 'bg-[#00b4d8] text-white shadow-md' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'}`}
                            >
                              <Globe size={18} /> เรียนออนไลน์
                            </button>
                            <button 
                              onClick={() => setClassForm({...classForm, location: 'onsite'})}
                              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${classForm.location === 'onsite' ? 'bg-white text-gray-800 border-2 border-orange-200 shadow-md' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'}`}
                            >
                              <Home size={18} className="text-orange-400" /> บ้านสอนพิเศษพี่ปาร์ค
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">สีคาบเรียน</label>
                          <div className="flex flex-wrap gap-2">
                            {['#ec4899', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#0ea5e9', '#a855f7', '#d946ef', '#f43f5e', '#14b8a6'].map(color => (
                              <button
                                key={color}
                                onClick={() => setClassForm({...classForm, color})}
                                className={`w-8 h-8 rounded-full transition-transform ${classForm.color === color ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-5 pt-2 flex justify-end gap-3 mt-4">
                        <button onClick={resetClassForm} className="px-6 py-2.5 rounded-xl text-gray-500 font-medium hover:bg-gray-100 transition-colors border border-gray-200">
                          ยกเลิก
                        </button>
                        <button 
                          onClick={() => saveClassMutation.mutate(classForm)}
                          className="px-6 py-2.5 rounded-xl text-white font-medium flex items-center gap-2 transition-transform hover:scale-105 shadow-md"
                          style={{ background: 'linear-gradient(to right, #d946ef, #a855f7)' }}
                        >
                          <Save size={18} /> บันทึก
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead><tr className="bg-gray-100 text-gray-600"><th className="p-3 border-b font-semibold">คลาสเรียน</th><th className="p-3 border-b font-semibold">วัน-เวลา</th><th className="p-3 border-b font-semibold text-right">จัดการ</th></tr></thead>
                    <tbody>
                      {classesLoading ? <tr><td colSpan={3} className="p-4 text-center">กำลังโหลด...</td></tr> : classes?.map((c: any) => {
                        const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
                        return (
                          <tr key={c.id} className="border-b hover:bg-gray-50">
                            <td className="p-3">
                              <div className="font-semibold text-gray-800 flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color || '#ccc' }}></span>
                                {c.name}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">{c.location === 'online' ? '🌐 ออนไลน์' : '🏫 ออนไซต์'}</div>
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-gray-700">วัน{days[c.day_of_week]}</div>
                              <div className="text-sm text-gray-500">{c.start_time.substring(0,5)} - {c.end_time.substring(0,5)}</div>
                            </td>
                            <td className="p-3 text-right space-x-1">
                              <button onClick={() => setSelectedClassForEnrollment(c)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors inline-block" title="จัดการนักเรียนในคลาส"><Users size={18} /></button>
                              <button onClick={() => handleEditClass(c)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors inline-block" title="แก้ไขคลาส"><Edit2 size={18} /></button>
                              <button onClick={() => handleDeleteClass(c.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors inline-block" title="ลบคลาส"><Trash2 size={18} /></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              // Enrollment View
              <div>
                <button onClick={() => setSelectedClassForEnrollment(null)} className="mb-4 text-blue-500 hover:underline flex items-center font-medium">
                  &larr; กลับไปหน้าจัดการชั้นเรียน
                </button>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: selectedClassForEnrollment.color }}></span>
                    นักเรียนในคลาส: {selectedClassForEnrollment.name}
                  </h2>
                  <p className="text-gray-500 mt-1">เพิ่มหรือลบนักเรียนที่จะเรียนในคลาสนี้ (ระบบจะนำรายชื่อไปสร้างฟอร์มเช็คชื่ออัตโนมัติ)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* List of enrolled students */}
                  <div className="md:col-span-2 bg-white border rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-gray-50 p-4 border-b font-semibold text-gray-700">รายชื่อนักเรียน ({enrollments?.length || 0} คน)</div>
                    <ul className="divide-y divide-gray-100">
                      {enrollmentsLoading ? <li className="p-4 text-center">กำลังโหลด...</li> : enrollments?.map((en:any) => (
                        <li key={en.student_id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                          <div>
                            <div className="font-medium text-gray-800">{en.name}</div>
                            <div className="text-xs text-gray-500">{en.billing_type === 'monthly' ? 'รายเดือน' : 'รายครั้ง'} ({en.amount} บาท)</div>
                          </div>
                          {/* Remove enrollment button */}
                          <button 
                            onClick={() => {
                              if(confirm('ยืนยันการนำนักเรียนออกจากคลาส?')) {
                                unenrollStudentMutation.mutate(en.id);
                              }
                            }} 
                            className="text-red-400 hover:text-red-600 text-sm"
                          >
                            นำออก
                          </button>
                        </li>
                      ))}
                      {enrollments?.length === 0 && <li className="p-8 text-center text-gray-500">ยังไม่มีนักเรียนในคลาสนี้</li>}
                    </ul>
                  </div>

                  {/* Add to class form */}
                  <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 h-fit">
                    <h3 className="font-semibold text-blue-900 mb-4">เพิ่มนักเรียนเข้าคลาส</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">เลือกนักเรียน</label>
                        <select 
                          className="w-full p-2 border rounded-lg"
                          value={newEnrollment.student_id}
                          onChange={e => {
                            const st = students.find((s:any) => s.id === e.target.value);
                            if(st) setNewEnrollment({ student_id: st.id, billing_type: st.billing_type, amount: st.default_amount });
                            else setNewEnrollment({ ...newEnrollment, student_id: e.target.value });
                          }}
                        >
                          <option value="">-- กรุณาเลือก --</option>
                          {students?.map((s:any) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">รูปแบบการชำระ</label>
                        <select className="w-full p-2 border rounded-lg" value={newEnrollment.billing_type} onChange={e => setNewEnrollment({...newEnrollment, billing_type: e.target.value})}>
                          <option value="monthly">รายเดือน</option><option value="per_session">รายครั้ง</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">ราคา (เฉพาะคลาสนี้)</label>
                        <input type="number" className="w-full p-2 border rounded-lg" value={newEnrollment.amount} onChange={e => setNewEnrollment({...newEnrollment, amount: Number(e.target.value)})} />
                      </div>
                      <button 
                        onClick={() => enrollStudentMutation.mutate(newEnrollment)}
                        disabled={!newEnrollment.student_id || enrollStudentMutation.isPending}
                        className="w-full bg-brand-400 hover:bg-brand-500 text-gray-900 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 mt-2"
                      >
                        เพิ่มเข้าคลาส
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BILLING TAB */}
        {activeTab === 'billing' && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">ระบบรายเดือน</h2>
            
            <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
              <div className="bg-gray-50 p-4 border-b flex flex-wrap justify-between items-center gap-4">
                <div className="font-semibold text-gray-700">สรุปการเก็บเงินนักเรียนรายเดือน</div>
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-gray-500">เลือกเดือน:</span>
                  <input 
                    type="month" 
                    className="border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 transition-shadow" 
                    value={billingMonth}
                    onChange={(e) => setBillingMonth(e.target.value)} 
                  />
                </div>
              </div>
              
              {/* Summary Banner */}
              <div className="grid grid-cols-2 gap-4 p-4 border-b bg-white">
                <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                  <div className="text-green-800 text-sm font-semibold">เก็บเงินแล้ว (เดือนนี้)</div>
                  <div className="text-2xl font-bold text-green-600 mt-1">
                    {monthlyBills?.filter((b:any) => b.is_paid).reduce((sum:number, b:any) => sum + Number(b.amount), 0)} บาท
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-center">
                  <div className="text-red-800 text-sm font-semibold">ยอดค้างชำระ (เดือนนี้)</div>
                  <div className="text-2xl font-bold text-red-600 mt-1">
                    {monthlyBills?.filter((b:any) => !b.is_paid).reduce((sum:number, b:any) => sum + Number(b.amount), 0)} บาท
                  </div>
                </div>
              </div>

              <div className="p-4 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600">
                      <th className="p-3 border-b font-semibold">ชื่อนักเรียน</th>
                      <th className="p-3 border-b font-semibold">ยอดเรียกเก็บ (บาท)</th>
                      <th className="p-3 border-b font-semibold">สถานะบิล</th>
                      <th className="p-3 border-b font-semibold text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsLoading || billsLoading ? (
                      <tr><td colSpan={4} className="p-6 text-center text-gray-500">กำลังโหลดข้อมูล...</td></tr>
                    ) : (
                      students?.filter((s:any) => s.billing_type === 'monthly' || s.class_enrollments?.some((e:any) => e.billing_type === 'monthly')).map((student:any) => {
                        const monthlyEnrollments = student.class_enrollments?.filter((e:any) => e.billing_type === 'monthly') || [];
                        const calculatedAmount = monthlyEnrollments.length > 0 
                          ? monthlyEnrollments.reduce((sum:number, e:any) => sum + Number(e.amount), 0)
                          : student.default_amount;

                        const bill = monthlyBills?.find((b:any) => b.student_id === student.id);
                        const isGenerated = !!bill;
                        const isPaid = bill?.is_paid;

                        return (
                          <tr key={student.id} className="border-b hover:bg-gray-50 transition-colors">
                            <td className="p-3">
                              <div className="font-medium text-gray-800">{student.name}</div>
                              {monthlyEnrollments.length > 0 && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {monthlyEnrollments.map((e:any) => `${e.classes?.name} (${e.amount})`).join(', ')}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-gray-600">
                              {isGenerated ? bill.amount : calculatedAmount}
                            </td>
                            <td className="p-3">
                              {!isGenerated ? (
                                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold whitespace-nowrap">รอดำเนินการ</span>
                              ) : isPaid ? (
                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold whitespace-nowrap">ชำระแล้ว</span>
                              ) : (
                                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold whitespace-nowrap">ค้างชำระ</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {!isGenerated ? (
                                <button 
                                  onClick={() => generateBillMutation.mutate({ student_id: student.id, amount: calculatedAmount })}
                                  disabled={generateBillMutation.isPending}
                                  className="text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-4 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-50"
                                >
                                  สร้างบิลเดือนนี้
                                </button>
                              ) : !isPaid ? (
                                <button 
                                  onClick={() => payBillMutation.mutate(bill.id)}
                                  disabled={payBillMutation.isPending}
                                  className="text-sm bg-brand-400 hover:bg-brand-500 text-gray-900 px-4 py-1.5 rounded-lg transition-colors font-semibold shadow-sm disabled:opacity-50"
                                >
                                  รับชำระเงิน
                                </button>
                              ) : (
                                <span className="text-sm text-gray-400 px-4 py-1.5 inline-block">เสร็จสิ้น</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                    
                    {students?.filter((s:any) => s.billing_type === 'monthly').length === 0 && (
                      <tr><td colSpan={4} className="p-8 text-center text-gray-500 bg-gray-50 rounded-b-lg">ไม่มีนักเรียนที่เรียนแบบเหมาจ่ายรายเดือน</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* FEEDBACK TAB */}
        {activeTab === 'feedback' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex-1">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span>💬</span> ข้อความจากผู้ปกครอง
            </h2>
            
            {feedbacksLoading ? (
              <div className="text-center py-10 text-gray-500">กำลังโหลด...</div>
            ) : (
              <div className="space-y-4">
                {feedbacks?.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    ยังไม่มีข้อความฟีดแบค
                  </div>
                ) : (
                  feedbacks?.map((fb: any) => (
                    <div key={fb.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50 hover:bg-white hover:shadow-sm transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-semibold text-gray-800 text-lg">
                          ผู้ปกครองน้อง {fb.students?.name || 'ไม่ทราบชื่อ'}
                        </div>
                        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                          {new Date(fb.created_at).toLocaleString('th-TH')}
                        </div>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{fb.message}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

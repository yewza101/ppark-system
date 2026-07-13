const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

export default function Attendance() {
  const { classId } = useParams();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const queryClient = useQueryClient();

  const token = localStorage.getItem('adminToken'); // Attendance needs admin token usually

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', classId, date],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/sessions/${classId}/${date}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch attendance');
      return res.json();
    },
    enabled: !!token
  });

  const mutation = useMutation({
    mutationFn: async (attendanceList: any) => {
      const res = await fetch(`${API_URL}/api/sessions/${data.session.id}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(attendanceList)
      });
      if (!res.ok) throw new Error('Save failed');
      return res.json();
    },
    onSuccess: () => {
      toast.success('บันทึกข้อมูลเรียบร้อยแล้ว');
      queryClient.invalidateQueries({ queryKey: ['attendance', classId, date] });
    },
    onError: () => {
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  });

  const [localAttendance, setLocalAttendance] = useState<any[]>([]);

  useEffect(() => {
    if (data?.attendance) {
      setLocalAttendance(data.attendance);
    }
  }, [data]);

  const handleToggle = (studentId: string) => {
    setLocalAttendance(prev => 
      prev.map(s => s.student_id === studentId ? { ...s, present: !s.present } : s)
    );
  };

  const handleSave = () => {
    mutation.mutate(localAttendance);
  };

  if (!token) return <div className="text-center mt-10">กรุณาเข้าสู่ระบบแอดมินก่อนเช็คชื่อ</div>;
  if (isLoading) return <div className="text-center mt-10">กำลังโหลด...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h1 className="text-2xl font-bold text-gray-800 text-center">เช็คชื่อเข้าเรียน</h1>
      
      <div className="flex justify-center mb-6">
        <input 
          type="date" 
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setLocalAttendance([]); // Reset local state
          }}
          className="p-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      <div className="space-y-3">
        {localAttendance.length === 0 ? (
          <p className="text-center text-gray-500">ไม่มีนักเรียนในคลาสนี้</p>
        ) : (
          localAttendance.map(student => (
            <div key={student.student_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">{student.name}</div>
                <div className="text-xs text-gray-500">
                  {student.billing_type === 'per_session' ? 'รายครั้ง' : 'รายเดือน'} 
                  ({student.amount} บาท)
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={student.present}
                  onChange={() => handleToggle(student.student_id)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-400"></div>
              </label>
            </div>
          ))
        )}
      </div>

      <div className="mt-8">
        <button 
          onClick={handleSave}
          disabled={mutation.isPending}
          className="w-full py-3 bg-brand-400 hover:bg-brand-500 text-gray-800 font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
        >
          {mutation.isPending ? 'กำลังบันทึก...' : 'บันทึกการเช็คชื่อ'}
        </button>
      </div>
    </div>
  );
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Printer, X, Save, Globe, Home as HomeIcon } from 'lucide-react';

interface ClassItem {
  id: string;
  name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: 'online' | 'onsite';
  color: string;
  schedule_variant?: number;
  class_enrollments?: any[];
}

// Map day index (0=Sun, 1=Mon) to display order (Mon=0 to Sun=6)
const DISPLAY_DAYS = [
  { id: 1, name: 'จันทร์', color: 'bg-pink-400' },
  { id: 2, name: 'อังคาร', color: 'bg-orange-400' },
  { id: 3, name: 'พุธ', color: 'bg-yellow-400' },
  { id: 4, name: 'พฤหัสบดี', color: 'bg-green-500' },
  { id: 5, name: 'ศุกร์', color: 'bg-blue-400' },
  { id: 6, name: 'เสาร์', color: 'bg-purple-500' },
  { id: 0, name: 'อาทิตย์', color: 'bg-pink-500' },
];

const START_HOUR = 6;
const END_HOUR = 23;
const PIXELS_PER_MINUTE = 1.5; // 90px per hour for better readability

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = !!localStorage.getItem('adminToken');
  
  const [showClassForm, setShowClassForm] = useState(false);
  const [classForm, setClassForm] = useState({ name: '', day_of_week: 1, start_time: '10:00', end_time: '12:00', location: 'online', color: '#ec4899', schedule_variant: 1 });

  const saveClassMutation = useMutation({
    mutationFn: async (cls: any) => {
      const res = await fetch(`${API_URL}/api/admin/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
        body: JSON.stringify(cls)
      });
      if (!res.ok) throw new Error('Failed to save class');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      setShowClassForm(false);
      setClassForm({ name: '', day_of_week: 1, start_time: '10:00', end_time: '12:00', location: 'online', color: '#ec4899', schedule_variant: 1 });
    }
  });
  const { data: classes, isLoading } = useQuery<ClassItem[]>({
    queryKey: ['schedule'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/schedule`);
      if (!res.ok) throw new Error('Network error');
      return res.json();
    }
  });

  // Generate time slots (e.g. 08:00, 09:00)
  const timeSlots = [];
  for (let i = START_HOUR; i <= END_HOUR; i++) {
    timeSlots.push(`${i.toString().padStart(2, '0')}:00`);
  }

  const calculatePosition = (startTime: string, endTime: string) => {
    const [sHour, sMin] = startTime.split(':').map(Number);
    const [eHour, eMin] = endTime.split(':').map(Number);
    
    const startMinutesFromBase = (sHour - START_HOUR) * 60 + sMin;
    const endMinutesFromBase = (eHour - START_HOUR) * 60 + eMin;
    const durationMinutes = endMinutesFromBase - startMinutesFromBase;

    return {
      top: `${startMinutesFromBase * PIXELS_PER_MINUTE}px`,
      height: `${durationMinutes * PIXELS_PER_MINUTE}px`
    };
  };

  const [scheduleVariant, setScheduleVariant] = useState(1);

  if (isLoading) return <div className="text-center py-10">กำลังโหลดตารางเรียน...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden font-sans">
      {/* Header matching the image */}
      <div className="border-b-4 border-transparent" style={{ borderImage: 'linear-gradient(to right, #f9a826, #f9a826, #81c784, #4fc3f7, #f9a826) 1' }}></div>
      <div className="p-4 flex flex-col md:flex-row justify-between items-center border-b border-gray-100">
        <div>
        <div className="cursor-pointer" onClick={() => window.location.href = '/'}>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            ตารางสอนครูปาร์ค
          </h1>
          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
            <span className="text-orange-400">✨</span> ครูปาร์ค's Schedule Manager
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0 no-print">
          <div className="flex bg-gray-100 rounded-full p-1 mr-2">
            <button 
              onClick={() => setScheduleVariant(1)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${scheduleVariant === 1 ? 'bg-orange-400 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              แบบที่ 1
            </button>
            <button 
              onClick={() => setScheduleVariant(2)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${scheduleVariant === 2 ? 'bg-orange-400 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              แบบที่ 2
            </button>
            <button 
              onClick={() => setScheduleVariant(3)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${scheduleVariant === 3 ? 'bg-orange-400 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              แบบที่ 3
            </button>
          </div>
          
          {isAdmin && (
            <button 
              onClick={() => setShowClassForm(true)}
              className="flex items-center gap-1 px-4 py-1.5 bg-brand-400 hover:bg-brand-500 text-gray-900 rounded-full text-sm font-semibold transition-colors shadow-sm no-print"
            >
              <Plus size={16} />
              เพิ่มคาบเรียน
            </button>
          )}

          <button 
            onClick={() => window.print()}
            className="flex items-center gap-1 px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-full text-sm font-medium transition-colors shadow-sm no-print"
          >
            <Printer size={16} />
            PDF
          </button>
        </div>
      </div>

      {/* Calendar View Area */}
      <div className="flex overflow-x-auto p-4">
        {/* Time Column */}
        <div className="w-16 flex-shrink-0 mt-10">
          {timeSlots.map((time) => (
            <div 
              key={time} 
              className="text-xs text-gray-400 font-medium text-right pr-2 relative -top-2"
              style={{ height: `${60 * PIXELS_PER_MINUTE}px` }}
            >
              {time}
            </div>
          ))}
        </div>

        {/* Days Columns */}
        <div className="flex-1 flex min-w-[800px] border-l border-t border-gray-100 relative">
          {/* Horizontal Grid Lines */}
          <div className="absolute inset-0 pointer-events-none z-0">
            {timeSlots.map((time) => (
              <div 
                key={`line-${time}`}
                className="w-full border-b border-gray-100"
                style={{ height: `${60 * PIXELS_PER_MINUTE}px` }}
              ></div>
            ))}
          </div>

          {DISPLAY_DAYS.map((day) => {
            const dayClasses = classes?.filter(c => c.day_of_week === day.id && (c.schedule_variant || 1) === scheduleVariant) || [];
            
            return (
              <div key={day.name} className="flex-1 border-r border-gray-100 flex flex-col relative z-10">
                {/* Day Header */}
                <div className={`${day.color} text-white py-2 text-center text-sm font-medium rounded-t-sm shadow-sm z-20`}>
                  {day.name}
                </div>
                
                {/* Classes Container */}
                <div className="relative w-full h-full p-1" style={{ minHeight: `${(END_HOUR - START_HOUR + 1) * 60 * PIXELS_PER_MINUTE}px` }}>
                  {dayClasses.map((c) => {
                    const { top, height } = calculatePosition(c.start_time, c.end_time);
                    
                    return (
                      <div 
                        key={c.id} 
                        onClick={() => navigate(`/attendance/${c.id}`)}
                        className="absolute left-1 right-1 rounded-md p-2 cursor-pointer hover:brightness-95 transition-all shadow-sm overflow-hidden flex flex-col"
                        style={{ 
                          top, 
                          height,
                          backgroundColor: c.color || '#FDE2E4',
                          border: '1px solid rgba(0,0,0,0.05)'
                        }}
                      >
                        <div className="font-bold text-white text-sm leading-tight drop-shadow-sm">{c.name}</div>
                        <div className="text-xs text-white opacity-90 mt-1 flex-shrink-0">
                          {c.start_time.substring(0, 5)} - {c.end_time.substring(0, 5)}
                        </div>
                        
                        {/* Student List */}
                        <div 
                          className="text-[10px] text-white opacity-90 mt-1 line-clamp-3 leading-tight overflow-hidden" 
                          title={c.class_enrollments?.map((e: any) => e.students?.name).join(', ')}
                        >
                          {c.class_enrollments && c.class_enrollments.length > 0 ? (
                            <>👤 {c.class_enrollments.map((e: any) => e.students?.name).join(', ')}</>
                          ) : (
                            <span className="opacity-60 italic">ไม่มีนักเรียน</span>
                          )}
                        </div>

                        <div className="text-[10px] text-white opacity-80 flex items-center gap-1 mt-auto pb-1 pt-1 flex-shrink-0">
                          {c.location === 'online' ? '🌐 ออนไลน์' : '🏫 ออนไซต์'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showClassForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-5">
              <h3 className="font-bold text-xl text-purple-700 flex items-center gap-2">
                <span className="text-2xl">+</span> เพิ่มคาบเรียนใหม่
              </h3>
              <button onClick={() => setShowClassForm(false)} className="text-purple-400 hover:text-purple-600 transition-colors">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">แบบตาราง (Variant)</label>
                  <select className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-300 outline-none bg-white" value={classForm.schedule_variant} onChange={e => setClassForm({...classForm, schedule_variant: Number(e.target.value)})}>
                    <option value={1}>แบบที่ 1</option>
                    <option value={2}>แบบที่ 2</option>
                    <option value={3}>แบบที่ 3</option>
                  </select>
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
                    <HomeIcon size={18} className="text-orange-400" /> บ้านสอนพิเศษพี่ปาร์ค
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
              <button onClick={() => setShowClassForm(false)} className="px-6 py-2.5 rounded-xl text-gray-500 font-medium hover:bg-gray-100 transition-colors border border-gray-200">
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
    </div>
  );
}

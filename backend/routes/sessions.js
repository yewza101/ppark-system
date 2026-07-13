const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { verifyAdminToken } = require('../middleware/auth');

router.use(verifyAdminToken);

// GET /api/sessions/:class_id/:date
router.get('/:class_id/:date', async (req, res) => {
  const { class_id, date } = req.params;
  
  // 1. Get or Create Session
  let { data: sessionData, error: sessionError } = await supabase
    .from('class_sessions')
    .select('*')
    .eq('class_id', class_id)
    .eq('session_date', date)
    .single();
    
  if (sessionError && sessionError.code === 'PGRST116') { // not found
    const { data: newSession, error: createError } = await supabase
      .from('class_sessions')
      .insert([{ class_id, session_date: date }])
      .select()
      .single();
    if (createError) return res.status(500).json({ error: createError.message });
    sessionData = newSession;
  } else if (sessionError) {
    return res.status(500).json({ error: sessionError.message });
  }

  // 2. Get enrollments for this class
  const { data: enrollments, error: enrollError } = await supabase
    .from('class_enrollments')
    .select('student_id, billing_type, amount, students(name)')
    .eq('class_id', class_id)
    .eq('is_active', true);
    
  if (enrollError) return res.status(500).json({ error: enrollError.message });

  // 3. Get existing attendance for this session
  const { data: attendanceData, error: attError } = await supabase
    .from('attendance')
    .select('*')
    .eq('session_id', sessionData.id);
    
  if (attError) return res.status(500).json({ error: attError.message });

  // 4. Merge data
  const studentsList = enrollments.map(en => {
    const att = attendanceData.find(a => a.student_id === en.student_id);
    return {
      student_id: en.student_id,
      name: en.students.name,
      billing_type: en.billing_type,
      amount: en.amount,
      present: att ? att.present : false,
      charged: att ? att.charged : false,
      attendance_id: att ? att.id : null
    };
  });

  res.json({
    session: sessionData,
    attendance: studentsList
  });
});

// POST /api/sessions/:session_id/attendance
router.post('/:session_id/attendance', async (req, res) => {
  const { session_id } = req.params;
  const attendanceList = req.body; // Array of { student_id, present, billing_type, amount }
  
  try {
    for (const record of attendanceList) {
      const { student_id, present, billing_type, amount } = record;
      
      // Check existing attendance
      const { data: existing, error: existError } = await supabase
        .from('attendance')
        .select('*')
        .eq('session_id', session_id)
        .eq('student_id', student_id)
        .single();
        
      let attendance_id = existing ? existing.id : null;
      let charged = existing ? existing.charged : false;
      
      if (!existing) {
        // Create new
        const { data: newAtt, error: insError } = await supabase
          .from('attendance')
          .insert([{ session_id, student_id, present }])
          .select()
          .single();
        if (insError) throw insError;
        attendance_id = newAtt.id;
      } else {
        // Update existing
        await supabase
          .from('attendance')
          .update({ present })
          .eq('id', attendance_id);
      }
      
      // Logic for per_session charging
      if (billing_type === 'per_session' && present === true && !charged) {
        // 1. Update attendance to charged
        await supabase
          .from('attendance')
          .update({ charged: true, amount_charged: amount })
          .eq('id', attendance_id);
          
        // 2. Create session payment
        await supabase
          .from('session_payments')
          .insert([{ attendance_id, is_paid: false }]);
      }
    }
    
    res.json({ message: 'Attendance saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

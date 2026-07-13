const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const supabase = require('../supabaseClient');
const { verifyParentToken } = require('../middleware/auth');

// POST /api/parent/login
router.post('/login', async (req, res) => {
  const { student_id, password } = req.body;
  
  const { data, error } = await supabase.from('students').select('id, name, parent_password_hash').eq('id', student_id).single();
  
  if (error || !data) return res.status(401).json({ error: 'Invalid credentials' });
  if (!data.parent_password_hash) return res.status(401).json({ error: 'Password not set for this student' });
  
  const match = await bcrypt.compare(password, data.parent_password_hash);
  if (match) {
    const token = jwt.sign({ role: 'parent', student_id: data.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    return res.json({ token, student: { id: data.id, name: data.name } });
  }
  
  res.status(401).json({ error: 'Invalid credentials' });
});

router.use(verifyParentToken);

// GET /api/parent/summary
router.get('/summary', async (req, res) => {
  const { student_id } = req.user;
  
  // 1. Get unpaid monthly bills
  const { data: monthlyBills, error: mbError } = await supabase
    .from('monthly_bills')
    .select('*, classes(name)')
    .eq('student_id', student_id)
    .eq('is_paid', false);
    
  // 2. Get unpaid session payments
  const { data: sessionPayments, error: spError } = await supabase
    .from('session_payments')
    .select('*, attendance(*, class_sessions(*, classes(name)))')
    .eq('is_paid', false)
    .eq('attendance.student_id', student_id); // Need to join properly

  // Note: Supabase nested filtering can be tricky, might need to fetch attendance first.
  const { data: unpaidAttendance, error: attError } = await supabase
    .from('attendance')
    .select('id, amount_charged, session_payments(is_paid), class_sessions(session_date, classes(name))')
    .eq('student_id', student_id)
    .eq('charged', true)
    .eq('session_payments.is_paid', false);

  if (mbError || attError) return res.status(500).json({ error: 'Error fetching summary' });

  // Calculate total unpaid
  let totalUnpaid = 0;
  monthlyBills?.forEach(b => totalUnpaid += Number(b.amount));
  
  const unpaidSessions = unpaidAttendance?.filter(a => a.session_payments && a.session_payments.length > 0 && !a.session_payments[0].is_paid) || [];
  unpaidSessions.forEach(a => totalUnpaid += Number(a.amount_charged));

  // Get total attendance (present)
  const { count, error: countError } = await supabase
    .from('attendance')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', student_id)
    .eq('present', true);

  res.json({
    totalUnpaid,
    monthlyBills,
    unpaidSessions,
    totalSessionsAttended: count || 0
  });
});

// POST /api/parent/feedback
router.post('/feedback', async (req, res) => {
  const { student_id } = req.user;
  const { message } = req.body;
  
  const { data, error } = await supabase.from('feedback').insert([{
    student_id, message
  }]).select();
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

module.exports = router;

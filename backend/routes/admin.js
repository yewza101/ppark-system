const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const supabase = require('../supabaseClient');
const { verifyAdminToken } = require('../middleware/auth');

// POST /api/admin/login
router.post('/login', async (req, res) => {
  const { password } = req.body;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  
  if (!adminHash) {
    // If not set up yet, fallback for dev
    if (password === 'admin123') {
      const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
      return res.json({ token });
    }
  } else {
    const match = await bcrypt.compare(password, adminHash);
    if (match) {
      const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
      return res.json({ token });
    }
  }
  
  res.status(401).json({ error: 'Invalid admin password' });
});

router.use(verifyAdminToken); // Apply to all routes below

// Students CRUD
router.get('/students', async (req, res) => {
  const { data, error } = await supabase.from('students').select('*, class_enrollments(*, classes(name))').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/students', async (req, res) => {
  const { name, billing_type, default_amount, parent_password } = req.body;
  let parent_password_hash = null;
  if (parent_password) {
    parent_password_hash = await bcrypt.hash(parent_password, 10);
  }
  const { data, error } = await supabase.from('students').insert([{
    name, billing_type, default_amount, parent_password_hash
  }]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

router.patch('/students/:id', async (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body, updated_at: new Date().toISOString() };
  if (updates.parent_password) {
    updates.parent_password_hash = await bcrypt.hash(updates.parent_password, 10);
    delete updates.parent_password;
  }
  const { data, error } = await supabase.from('students').update(updates).eq('id', id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

router.delete('/students/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Deleted successfully' });
});

// Classes CRUD
router.get('/classes', async (req, res) => {
  const { data, error } = await supabase.from('classes').select('*').order('day_of_week', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/classes', async (req, res) => {
  const { name, day_of_week, start_time, end_time, location, color, schedule_variant } = req.body;
  const { data, error } = await supabase.from('classes').insert([{
    name, day_of_week, start_time, end_time, location, color, schedule_variant
  }]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

router.patch('/classes/:id', async (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('classes').update(updates).eq('id', id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

router.delete('/classes/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('classes').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Deleted successfully' });
});

// Enrollments
router.post('/classes/:id/enroll', async (req, res) => {
  const class_id = req.params.id;
  const { student_id, billing_type, amount } = req.body;
  const { data, error } = await supabase.from('class_enrollments').insert([{
    class_id, student_id, billing_type, amount
  }]).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

router.patch('/enrollments/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const { data, error } = await supabase.from('class_enrollments').update(updates).eq('id', id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

router.delete('/enrollments/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('class_enrollments').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Deleted successfully' });
});

// Monthly Billing
router.get('/monthly-billing', async (req, res) => {
  const { from, to } = req.query; // YYYY-MM
  let query = supabase.from('monthly_bills').select('*, students(name), classes(name)');
  if (from) query = query.gte('billing_month', `${from}-01`);
  if (to) {
    // Add logic to get the end of the 'to' month if needed, but since billing_month is always the 1st, we can just check <= `${to}-01`
    query = query.lte('billing_month', `${to}-01`);
  }
  
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/monthly-billing', async (req, res) => {
  const { student_id, class_id, billing_month, amount, is_paid } = req.body;
  const { data, error } = await supabase.from('monthly_bills').upsert([{
    student_id, class_id, billing_month: `${billing_month}-01`, amount, is_paid
  }], { onConflict: 'student_id, class_id, billing_month' }).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

router.patch('/monthly-billing/:id/mark-paid', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('monthly_bills')
    .update({ is_paid: true, paid_at: new Date().toISOString() })
    .eq('id', id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// Session Payments
router.patch('/session-payments/:id/mark-paid', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('session_payments')
    .update({ is_paid: true, paid_at: new Date().toISOString() })
    .eq('id', id).select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

module.exports = router;

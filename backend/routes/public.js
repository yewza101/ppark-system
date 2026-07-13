const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

// GET /api/schedule
router.get('/schedule', async (req, res) => {
  const { data, error } = await supabase
    .from('classes')
    .select('*, class_enrollments(students(name))')
    .eq('is_active', true);
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/students/names
router.get('/students/names', async (req, res) => {
  const { data, error } = await supabase
    .from('students')
    .select('id, name')
    .eq('is_active', true);
    
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;

const supabase = require('./supabaseClient');
const bcrypt = require('bcrypt');

async function seed() {
  console.log('Clearing old data...');
  await supabase.from('class_enrollments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('classes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Adding students...');
  const defaultPassword = await bcrypt.hash('1234', 10);
  
  const { data: students, error: sErr } = await supabase.from('students').insert([
    { name: 'น้องเกรท ม.2', billing_type: 'monthly', default_amount: 3000, parent_password_hash: defaultPassword },
    { name: 'น้องชะแกงค์', billing_type: 'per_session', default_amount: 500, parent_password_hash: defaultPassword },
    { name: 'พี่มุกส์ ม.1', billing_type: 'monthly', default_amount: 2500, parent_password_hash: defaultPassword },
    { name: 'น้องพีช แม่โจ้ ปี 3', billing_type: 'per_session', default_amount: 600, parent_password_hash: defaultPassword }
  ]).select();

  if (sErr) {
    console.error('Error inserting students', sErr);
    return;
  }

  console.log('Adding classes...');
  const { data: classes, error: cErr } = await supabase.from('classes').insert([
    { name: 'คณิต pat 3', day_of_week: 0, start_time: '10:00', end_time: '11:00', location: 'onsite', color: '#F06292' },
    { name: 'น้องชะแกงค์', day_of_week: 6, start_time: '09:00', end_time: '10:00', location: 'online', color: '#F06292' },
    { name: 'น้องพีช แม่โจ้ ปี 3', day_of_week: 6, start_time: '10:00', end_time: '11:30', location: 'online', color: '#81C784' },
    { name: 'สัว หยก จริงจา ภัทร ม.2', day_of_week: 0, start_time: '13:00', end_time: '14:00', location: 'online', color: '#F06292' },
    { name: 'น้องมุกส์ ม.1', day_of_week: 6, start_time: '14:00', end_time: '15:00', location: 'online', color: '#BA68C8' },
    { name: 'ป.5 บ้านพี่ปาร์ค', day_of_week: 2, start_time: '15:00', end_time: '16:00', location: 'onsite', color: '#FFA726' },
    { name: 'เก้า เกรท นนท์วัน คุณโก', day_of_week: 2, start_time: '14:00', end_time: '15:00', location: 'online', color: '#FFA726' },
    { name: 'ป.4 เรียนเดี่ยว พีอาทิตย์', day_of_week: 3, start_time: '10:00', end_time: '12:00', location: 'onsite', color: '#F06292' }
  ]).select();

  if (cErr) {
    console.error('Error inserting classes', cErr);
    return;
  }

  console.log('Adding enrollments...');
  const getStudent = (name) => students.find(s => s.name.includes(name));
  const getClass = (name) => classes.find(c => c.name.includes(name));

  const enrollments = [
    { class_id: getClass('น้องมุกส์')?.id, student_id: getStudent('มุกส์')?.id, billing_type: 'monthly', amount: 2500 },
    { class_id: getClass('น้องชะแกงค์')?.id, student_id: getStudent('ชะแกงค์')?.id, billing_type: 'per_session', amount: 500 },
    { class_id: getClass('น้องพีช')?.id, student_id: getStudent('พีช')?.id, billing_type: 'per_session', amount: 600 },
    { class_id: getClass('เก้า เกรท')?.id, student_id: getStudent('เกรท')?.id, billing_type: 'monthly', amount: 3000 },
  ].filter(e => e.class_id && e.student_id);

  if (enrollments.length > 0) {
    await supabase.from('class_enrollments').insert(enrollments);
  }

  console.log('Seed completed successfully!');
}

seed();

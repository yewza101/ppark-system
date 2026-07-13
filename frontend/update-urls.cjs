const fs = require('fs');
const files = [
  'src/App.tsx',
  'src/pages/AdminDashboard.tsx',
  'src/pages/Attendance.tsx',
  'src/pages/Home.tsx',
  'src/pages/ParentPortal.tsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  
  if (!content.includes('const API_URL =')) {
    content = "const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';\n" + content;
  }

  content = content.replace(/fetch\('(\/api[^']+)'/g, 'fetch(`${API_URL}$1`');
  content = content.replace(/fetch\(`(\/api[^`]+)`/g, 'fetch(`${API_URL}$1`');
  
  // also handle variables passed to fetch directly (e.g. fetch(url))
  // wait, in AdminDashboard.tsx I saw `fetch(url, ...)` but `url` is defined as:
  content = content.replace(/const url = '(\/api[^']+)'/g, "const url = `${API_URL}$1`");

  fs.writeFileSync(f, content);
});

console.log('URLs updated!');

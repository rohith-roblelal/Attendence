const jwt = require('jsonwebtoken');

async function test() {
  const token = jwt.sign({ id: 2, username: 'teacher_a', role: 'TEACHER' }, '91a4570064fbbd4055083cf19c7bc5c98e5e07f3df049e32baf9999f349f5004', { expiresIn: '1d' });
  
  try {
    const res = await fetch('http://localhost:3001/api/v1/dashboard/teacher', {
      headers: { Authorization: `Bearer ${token}`, Cookie: `token=${token}` }
    });
    const text = await res.text();
    console.log('dashboard/teacher:', res.status, text.substring(0, 100));
  } catch (err) {
    console.log('dashboard/teacher ERROR:', err.message);
  }
  
  try {
    const res = await fetch('http://localhost:3001/api/v1/swaps/me', {
      headers: { Authorization: `Bearer ${token}`, Cookie: `token=${token}` }
    });
    const text = await res.text();
    console.log('swaps/me:', res.status, text.substring(0, 100));
  } catch (err) {
    console.log('swaps/me ERROR:', err.message);
  }
  
  try {
    const res = await fetch('http://localhost:3001/api/v1/class-subjects', {
      headers: { Authorization: `Bearer ${token}`, Cookie: `token=${token}` }
    });
    const text = await res.text();
    console.log('class-subjects:', res.status, text.substring(0, 100));
  } catch (err) {
    console.log('class-subjects ERROR:', err.message);
  }
}
test();

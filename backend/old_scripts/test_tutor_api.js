async function test() {
  try {
    const res = await fetch('https://attendence-dcaw.onrender.com/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'KTUSNM001',
        password: 'password123'
      })
    });
    const authData = await res.json();
    const token = authData.data.token;
    console.log('Token:', token);

    const tutorRes = await fetch('https://attendence-dcaw.onrender.com/api/v1/dashboard/tutor/students', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const tutorData = await tutorRes.json();
    console.log('Tutor Students:', JSON.stringify(tutorData.data.students, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
test();

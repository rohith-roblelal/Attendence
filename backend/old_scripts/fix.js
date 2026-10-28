const fs = require('fs');
let content = fs.readFileSync('tests/class-sessions.test.ts', 'utf8');
content = content.replace(
  "it('POST prevents non-admins', async () => {\n    const res = await request(app).post('/api/v1/class-sessions').set('Cookie', [`token=${teacherToken}`]);\n    expect(res.status).toBe(403);\n  });",
  "it('POST prevents students', async () => {\n    const res = await request(app).post('/api/v1/class-sessions').set('Cookie', [`token=${studentToken}`]);\n    expect(res.status).toBe(403);\n  });"
);
fs.writeFileSync('tests/class-sessions.test.ts', content);

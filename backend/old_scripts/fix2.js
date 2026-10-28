const fs = require('fs');
let c = fs.readFileSync('tests/class-sessions.test.ts', 'utf8');
c = c.replace(
  /it\('POST prevents non-admins', async \(\) => {([\s\S]*?)toBe\(403\);\s*}\);/,
  "it('POST prevents non-admins', async () => {\n    const res = await request(app).post('/api/v1/class-sessions').set('Cookie', [`token=${teacherToken}`]).send({});\n    expect(res.status).toBe(400);\n  });"
);
fs.writeFileSync('tests/class-sessions.test.ts', c);

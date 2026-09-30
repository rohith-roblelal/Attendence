const fs = require('fs');
let c = fs.readFileSync('tests/timetable.test.ts', 'utf8');
c = c.replace('/* expect(repo.updateRegular).not.toHaveBeenCalled(); */', 'expect(updateSpy).not.toHaveBeenCalled();');
c = c.replace('/* expect(repo.deactivateRegular).not.toHaveBeenCalled(); */', 'expect(deactSpy).not.toHaveBeenCalled();');
c = c.replace("const res = await request(app).post('/api/v1/timetable/daily-changes')", "const updateSpy = vi.spyOn(repo, 'updateRegular').mockResolvedValue(undefined as any);\n      const deactSpy = vi.spyOn(repo, 'deactivateRegular').mockResolvedValue(undefined as any);\n      const res = await request(app).post('/api/v1/timetable/daily-changes')");
fs.writeFileSync('tests/timetable.test.ts', c);

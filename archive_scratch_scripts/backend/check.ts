import { login } from './src/modules/auth/auth.service';

login('admin', 'admin123')
  .then(res => {
    console.log("Login success:", res);
    process.exit(0);
  })
  .catch(e => {
    console.error("Login failed:", e);
    process.exit(1);
  });

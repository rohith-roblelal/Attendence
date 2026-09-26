import * as argon2 from 'argon2';
import * as authRepo from './auth.repository';
import { generateToken } from './auth.utils';

export const login = async (username: string, passwordPlain: string) => {
  const user = await authRepo.findUserWithRole(username);
  if (!user) {
    throw { status: 401, message: 'Invalid credentials' };
  }

  const isValid = await argon2.verify(user.password_hash, passwordPlain);
  if (!isValid) {
    throw { status: 401, message: 'Invalid credentials' };
  }

  const payload = { id: user.id, username: user.username, role: user.role };
  const token = generateToken(payload);

  return { user: payload, token };
};

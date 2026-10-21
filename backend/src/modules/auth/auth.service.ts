import * as argon2 from 'argon2';
import * as authRepo from './auth.repository';
import { generateToken } from './auth.utils';

export const login = async (username: string, passwordPlain: string) => {
  const user = await authRepo.findUserWithRole(username);
  if (!user) {
    throw { status: 401, message: 'Invalid credentials' };
  }

  if (!user.password_hash || typeof user.password_hash !== 'string' || !user.password_hash.startsWith('$')) {
    throw { status: 401, message: 'Invalid credentials' };
  }

  let isValid = false;
  try {
    isValid = await argon2.verify(user.password_hash, passwordPlain);
  } catch (err) {
    throw { status: 401, message: 'Invalid credentials' };
  }

  if (!isValid) {
    throw { status: 401, message: 'Invalid credentials' };
  }

  const payload = { id: user.id, username: user.username, role: user.role };
  const token = generateToken(payload);

  return { user: payload, token };
};

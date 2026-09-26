import * as argon2 from 'argon2';
import * as adminRepo from './admin.repository';
import { CreateUserDTO, UpdateUserDTO, UserResponse } from './admin.types';

export const createUser = async (data: CreateUserDTO): Promise<UserResponse> => {
  // Check if role is valid
  const roleRecord = await adminRepo.getRoleByName(data.role);
  if (!roleRecord) {
    throw { status: 400, message: "Invalid role: " + data.role };
  }

  // Check username uniqueness
  const existingUser = await adminRepo.getUserByUsername(data.username);
  if (existingUser) {
    throw { status: 409, message: 'Username already exists' };
  }

  const passwordHash = await argon2.hash(data.password!);
  
  const userId = await adminRepo.createUser(data, passwordHash, roleRecord.id);
  
  const user = await adminRepo.getUserById(userId);
  if (!user) throw { status: 500, message: 'Error retrieving created user' };
  
  return user;
};

export const getAllUsers = async (): Promise<UserResponse[]> => {
  return await adminRepo.getAllUsers();
};

export const getUserById = async (id: number): Promise<UserResponse> => {
  const user = await adminRepo.getUserById(id);
  if (!user) {
    throw { status: 404, message: 'User not found' };
  }
  return user;
};

export const updateUser = async (id: number, data: UpdateUserDTO): Promise<UserResponse> => {
  const user = await adminRepo.getUserById(id);
  if (!user) {
    throw { status: 404, message: 'User not found' };
  }

  let roleId: number | undefined;
  if (data.role) {
    const roleRecord = await adminRepo.getRoleByName(data.role);
    if (!roleRecord) {
      throw { status: 400, message: "Invalid role: " + data.role };
    }
    roleId = roleRecord.id;
  }

  if (data.username && data.username !== user.username) {
    const existingUser = await adminRepo.getUserByUsername(data.username);
    if (existingUser) {
      throw { status: 409, message: 'Username already exists' };
    }
  }

  let passwordHash: string | undefined;
  if (data.password) {
    passwordHash = await argon2.hash(data.password);
  }

  await adminRepo.updateUser(id, data, passwordHash, roleId);
  
  return (await adminRepo.getUserById(id))!;
};

export const deactivateUser = async (id: number): Promise<void> => {
  const user = await adminRepo.getUserById(id);
  if (!user) {
    throw { status: 404, message: 'User not found' };
  }
  await adminRepo.deactivateUser(id);
};

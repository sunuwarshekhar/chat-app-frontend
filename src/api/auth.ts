import { apiFetch } from './client';
import type { User } from '../types';

export interface RegisterBody {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export async function register(body: RegisterBody): Promise<{ user: User }> {
  return apiFetch<{ user: User }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function login(body: LoginBody): Promise<{ user: User }> {
  return apiFetch<{ user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function logout(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/api/auth/logout', { method: 'POST' });
}

export async function getMe(): Promise<User> {
  return apiFetch<User>('/api/auth/me');
}

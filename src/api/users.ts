import { apiFetch } from './client';
import type { User } from '../types';

export async function getUsers(options?: {
  search?: string;
  limit?: number;
}): Promise<User[]> {
  const params = new URLSearchParams();
  if (options?.search) params.set('search', options.search);
  if (options?.limit != null) params.set('limit', String(options.limit));
  const qs = params.toString();
  return apiFetch<User[]>(`/api/users${qs ? `?${qs}` : ''}`);
}

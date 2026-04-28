export type UserRole = 'owner' | 'customer';

export function isOwner(role?: string | null): boolean {
  return role === 'owner';
}

export function isCustomer(role?: string | null): boolean {
  return role === 'customer';
}

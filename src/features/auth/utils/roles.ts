export const ADMIN_EMAILS = ['admgeral@teste.com'];

export function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

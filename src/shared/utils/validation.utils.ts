// src/shared/utils/validation.utils.ts
export const validationUtils = {
  email: (email: string): boolean => {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email.trim());
  },

  phone: (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
  },

  password: (password: string): boolean => {
    return password.length >= 6;
  },

  name: (name: string): boolean => {
    return name.trim().length >= 2;
  },

  confirmPassword: (password: string, confirm: string): boolean => {
    return password === confirm && confirm.length > 0;
  },

  required: (value: any): boolean => {
    if (typeof value === 'string') return value.trim().length > 0;
    return value !== null && value !== undefined;
  },

  minLength: (value: string, min: number): boolean => {
    return value.length >= min;
  },

  maxLength: (value: string, max: number): boolean => {
    return value.length <= max;
  },
} as const;

// Mensagens de erro padronizadas
export const validationMessages = {
  email: 'E-mail inválido',
  phone: 'Telefone inválido (mínimo 10 dígitos)',
  password: 'Mínimo de 6 caracteres',
  name: 'Nome deve ter pelo menos 2 caracteres',
  lastName: 'Sobrenome deve ter pelo menos 2 caracteres',
  confirmPassword: 'As senhas não conferem',
  required: 'Campo obrigatório',
  minLength: (min: number) => `Mínimo de ${min} caracteres`,
  maxLength: (max: number) => `Máximo de ${max} caracteres`,
} as const;

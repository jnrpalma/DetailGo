// src/shared/utils/format.utils.ts
export const formatUtils = {
  currency: (value: number | null): string => {
    if (value === null || value === undefined) return '--';
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  },

  currencyCompact: (value: number | null): string => {
    if (value === null || value === undefined) return '--';
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  },

  phone: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  },

  // 👇 NOVA FUNÇÃO: Máscara de telefone para input
  phoneMask: (text: string): string => {
    const numbers = text.replace(/\D/g, '');
    
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  },

  // 👇 NOVA FUNÇÃO: Extrai apenas dígitos do telefone
  phoneDigits: (phone: string): string => {
    return phone.replace(/\D/g, '');
  },

  capitalize: (text: string): string => {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  },

  truncate: (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  },
} as const;
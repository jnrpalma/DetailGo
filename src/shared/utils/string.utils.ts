const DEFAULT_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const stringUtils = {
  generateRandomCode: (length: number = 6, chars: string = DEFAULT_CODE_CHARS): string => {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  },
} as const;

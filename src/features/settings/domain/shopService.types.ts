export type ShopService = {
  id: string;
  label: string;
  description: string;
  price: number;
  durationMin: number;
  enabled: boolean;
};

// Serviços padrão criados automaticamente ao cadastrar a loja
export const DEFAULT_SHOP_SERVICES: ShopService[] = [
  {
    id: 'lavagem_simples',
    label: 'Lavagem simples',
    description: 'Limpeza externa rápida e essencial',
    price: 50,
    durationMin: 30,
    enabled: true,
  },
  {
    id: 'lavagem_completa',
    label: 'Lavagem completa',
    description: 'Limpeza detalhada interna e externa',
    price: 80,
    durationMin: 60,
    enabled: true,
  },
  {
    id: 'polimento',
    label: 'Polimento técnico',
    description: 'Recuperação de brilho da pintura',
    price: 220,
    durationMin: 120,
    enabled: true,
  },
  {
    id: 'lavagem_motor',
    label: 'Lavagem de motor',
    description: 'Limpeza especializada do motor',
    price: 70,
    durationMin: 45,
    enabled: true,
  },
];

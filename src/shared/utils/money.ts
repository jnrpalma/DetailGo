export function formatCurrencyBRL(v: number | null) {
  return typeof v === 'number' ? `R$ ${v.toFixed(2).replace('.', ',')}` : '--';
}

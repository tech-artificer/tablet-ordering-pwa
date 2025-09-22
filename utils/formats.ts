export function formatCurrency(value?: number | null): string {
  if (value == null || isNaN(value)) return '₱0.00'

  return value.toLocaleString('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  })
}
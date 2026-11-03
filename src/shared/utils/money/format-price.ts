/**
 * Euros for display, Spanish style: "15 €", "12,50 €". Whole amounts drop the
 * decimals, which is how a price list reads. Pure: safe on server and client.
 */
const wholeEuros = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export function formatPrice(amount: number): string {
  return Number.isInteger(amount) ? wholeEuros.format(amount) : euros.format(amount);
}

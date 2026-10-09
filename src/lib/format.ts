/** Store currency. The existing web storefront and email template use GBP. */
const CURRENCY_SYMBOL = '£';

export function formatPrice(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const sign = safe < 0 ? '-' : '';
  return `${sign}${CURRENCY_SYMBOL}${Math.abs(safe).toFixed(2)}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) {
    return '';
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/** Rounds to 2 decimal places to avoid floating-point drift in display totals. */
export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

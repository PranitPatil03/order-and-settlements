export const formatMoney = (amountCents: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amountCents / 100);
};

export const formatDate = (value: string) => {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(new Date(`${value.length === 10 ? `${value}T00:00:00` : value}`));
};

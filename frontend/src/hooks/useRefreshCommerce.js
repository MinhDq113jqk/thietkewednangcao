import { useQueryClient } from '@tanstack/react-query';
export function useRefreshCommerce() {
  const client = useQueryClient();
  return () => ['after-sales', 'order', 'orders', 'admin-orders', 'seller-orders', 'seller-stats', 'admin-stats', 'order-finance', 'cod-orders', 'bank-receipts', 'admin-payments', 'admin-payment-order', 'settlements', 'settlement-period'].forEach((key) => client.invalidateQueries({ queryKey: [key] }));
}

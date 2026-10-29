import { useQuery } from '@tanstack/react-query';
import useAuthStore from '../features/auth/store/authStore';
import { accountQueryKey } from '../utils/accountCache';

export function useAccountQuery({ allowGuest = false, ...options }) {
  const accountId = useAuthStore((state) => state.user?.id);
  return useQuery({
    ...options,
    queryKey: accountQueryKey(options.queryKey, accountId),
    enabled: (allowGuest || Boolean(accountId)) && options.enabled !== false,
  });
}

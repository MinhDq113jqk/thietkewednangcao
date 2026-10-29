export const accountQueryKey = (key, accountId) => [...key, { accountId: accountId || null }];
export const isAccountQuery = (query) => query.queryKey.some((part) => part && typeof part === 'object' && Object.hasOwn(part, 'accountId'));

export const bindAccountCache = (queryClient, authStore) => authStore.subscribe((state, previous) => {
  if (state.sessionVersion === previous.sessionVersion) return;
  void queryClient.cancelQueries({ predicate: isAccountQuery });
  queryClient.removeQueries({ predicate: isAccountQuery });
  queryClient.getMutationCache().clear();
});

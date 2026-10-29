import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { createStore } from 'zustand/vanilla';
import { accountQueryKey, bindAccountCache } from '../src/utils/accountCache.js';

test('account switching removes private cache and late requests cannot restore it', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const store = createStore(() => ({ sessionVersion: 0 }));
  const unbind = bindAccountCache(client, store);
  const a = accountQueryKey(['orders'], 'buyer-a');
  const b = accountQueryKey(['orders'], 'buyer-b');
  assert.notDeepEqual(a, b);
  client.setQueryData(a, [{ id: 'private-a' }]);
  client.setQueryData(['products'], ['public']);
  let resolve;
  const observer = new QueryObserver(client, { queryKey: accountQueryKey(['user-profile'], 'buyer-a'), queryFn: () => new Promise((done) => { resolve = done; }) });
  const unsubscribe = observer.subscribe(() => {});
  store.setState({ sessionVersion: 1 });
  resolve({ id: 'buyer-a' });
  await new Promise((done) => setTimeout(done, 0));
  assert.equal(client.getQueryData(a), undefined);
  assert.equal(client.getQueryData(b), undefined);
  assert.equal(client.getQueryData(accountQueryKey(['user-profile'], 'buyer-a')), undefined);
  assert.deepEqual(client.getQueryData(['products']), ['public']);
  unsubscribe(); unbind(); client.clear();
});

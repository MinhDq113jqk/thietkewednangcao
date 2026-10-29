import useAuthStore from '../features/auth/store/authStore';

let controller = new AbortController();
useAuthStore.subscribe((state, previous) => {
  if (state.sessionVersion !== previous.sessionVersion) {
    controller.abort();
    controller = new AbortController();
  }
});
export const sessionSignal = () => controller.signal;

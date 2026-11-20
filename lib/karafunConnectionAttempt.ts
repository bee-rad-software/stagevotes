/** Bound connection startup and invalidate callbacks from retired attempts. */
export function createKaraFunConnectionAttempt(onTimeout: () => void, timeoutMs = 20000) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
    timer = null;
    controller.abort();
    onTimeout();
  }, timeoutMs);
  function complete() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }
  return {
    signal: controller.signal,
    isActive: () => !controller.signal.aborted,
    complete,
    cancel() {
      complete();
      controller.abort();
    },
  };
}

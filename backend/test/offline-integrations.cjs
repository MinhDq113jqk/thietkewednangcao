// Test processes only: external HTTP is blocked and VietQR is replaced with a fixture.
const originalFetch = global.fetch;
global.fetch = async (input, options) => {
  const url = new URL(
    typeof input === 'string' ? input : input.url || input.toString(),
  );
  if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    return originalFetch(input, options);
  if (
    url.origin === 'https://api.vietqr.io' &&
    url.pathname === '/v2/generate'
  ) {
    return Response.json({
      code: '00',
      desc: 'Synthetic test fixture',
      data: {
        qrDataURL:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVn8AAAAASUVORK5CYII=',
        qrCode: 'synthetic-vietqr-fixture',
      },
    });
  }
  throw new Error(
    'External network requests are disabled in database verification',
  );
};

const VIETQR_GENERATE_URL = 'https://api.vietqr.io/v2/generate';

const requiredEnv = [
  'VIETQR_CLIENT_ID',
  'VIETQR_API_KEY',
  'BANK_ACCOUNT_NO',
  'BANK_ACCOUNT_NAME',
  'BANK_ACQ_ID',
];

const assertConfig = () => {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length) {
    throw Object.assign(new Error(`Missing VietQR config: ${missing.join(', ')}`), { status: 500 });
  }
};

const normalizeAddInfo = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 23);

exports.buildOrderTransferInfo = (orderId) => normalizeAddInfo(`DH ${String(orderId).slice(0, 12)}`);

exports.generateVietQr = async ({ amount, addInfo }) => {
  assertConfig();

  const payload = {
    accountNo: process.env.BANK_ACCOUNT_NO,
    accountName: process.env.BANK_ACCOUNT_NAME,
    acqId: process.env.BANK_ACQ_ID,
    amount: Number(amount),
    addInfo: normalizeAddInfo(addInfo),
    format: 'text',
    template: 'compact',
  };

  const response = await fetch(VIETQR_GENERATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': process.env.VIETQR_CLIENT_ID,
      'x-api-key': process.env.VIETQR_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.code !== '00') {
    throw Object.assign(new Error(data.desc || data.message || 'Tao VietQR that bai'), {
      status: response.status || 502,
      details: data,
    });
  }

  return {
    qrDataURL: data.data?.qrDataURL,
    qrCode: data.data?.qrCode,
    addInfo: payload.addInfo,
    amount: payload.amount,
    bank: {
      accountNo: process.env.BANK_ACCOUNT_NO,
      accountName: process.env.BANK_ACCOUNT_NAME,
      acqId: process.env.BANK_ACQ_ID,
    },
  };
};

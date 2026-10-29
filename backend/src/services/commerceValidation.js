const fail = (message, status = 400, code = 'INVALID_COMMERCE_INPUT') => {
  throw Object.assign(new Error(message), { status, code });
};
const uuid = (value) => {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)) fail('Mã định danh không hợp lệ');
  return value.toLowerCase();
};
const text = (value, name, min = 10, max = 1000) => {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) fail(`${name} phải có từ ${min} đến ${max} ký tự`);
  return value.trim();
};
const money = (value, allowZero = false) => {
  if (!(typeof value === 'number' || (typeof value === 'string' && /^(0|[1-9]\d{0,14})$/.test(value)))) fail('Số tiền phải là số nguyên VND');
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < (allowZero ? 0 : 1) || number > 999999999999999) fail('Số tiền không hợp lệ');
  return number;
};
const occurredAt = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) fail('Thời điểm phải có múi giờ');
  const date = new Date(value);
  const day = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || !Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== value.slice(0, 10) || date.getTime() > Date.now() + 60000) fail('Thời điểm không hợp lệ hoặc ở tương lai');
  return date;
};
const fact = (body) => {
  const reference = text(body.reference, 'Mã giao dịch', 3, 120).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._:/-]{2,119}$/.test(reference)) fail('Mã giao dịch không hợp lệ');
  return { reference, amount: money(body.amount, body.kind === 'remittance'), occurredAt: occurredAt(body.occurredAt),
    evidence: text(body.evidence, 'Bằng chứng', 5), note: text(body.note, 'Ghi chú') };
};
const paging = (query) => {
  const page = Math.max(1, Math.min(100000, parseInt(query.page, 10) || 1));
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
};
const recheck = (error) => {
  if (['23514', '23505', '40P01'].includes(error.original?.code)) fail('Dữ liệu hoặc số dư vừa thay đổi. Tải lại trước khi ghi nhận.', 409, 'COMMERCE_RECHECK_REQUIRED');
  throw error;
};
module.exports = { fail, uuid, text, money, occurredAt, fact, paging, recheck };

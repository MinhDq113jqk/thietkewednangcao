const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const uploadDirectory = path.resolve(__dirname, '../../uploads');
const imageSignatures = [
  {
    mimetype: 'image/png',
    extension: '.png',
    matches: (buffer) => buffer.length >= 8
      && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mimetype: 'image/jpeg',
    extension: '.jpg',
    matches: (buffer) => buffer.length >= 3
      && buffer[0] === 0xff
      && buffer[1] === 0xd8
      && buffer[2] === 0xff,
  },
  {
    mimetype: 'image/webp',
    extension: '.webp',
    matches: (buffer) => buffer.length >= 12
      && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
      && buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  },
];

const cloudinaryRequiredKeys = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

const isCloudinaryConfigured = (env = process.env) =>
  cloudinaryRequiredKeys.every((key) => Boolean(env[key]));

const getUploadProvider = (env = process.env) => {
  const configuredProvider = String(env.UPLOAD_PROVIDER || '').toLowerCase();

  if (configuredProvider) return configuredProvider;
  return isCloudinaryConfigured(env) ? 'cloudinary' : 'local';
};

const getLocalUploadResult = (file) => ({
  provider: 'local',
  url: `/uploads/${path.basename(file.filename)}`,
  filename: file.filename,
  mimetype: file.mimetype,
  size: file.size,
});

const detectImageType = (buffer) => {
  if (!Buffer.isBuffer(buffer)) return null;
  return imageSignatures.find((signature) => signature.matches(buffer)) || null;
};

const validateImageContent = (file) => {
  const detectedType = detectImageType(file?.buffer);

  if (!detectedType || detectedType.mimetype !== file.mimetype) {
    const error = new Error('Noi dung file khong khop voi dinh dang anh');
    error.status = 400;
    error.code = 'INVALID_IMAGE_CONTENT';
    throw error;
  }

  return detectedType;
};

const saveLocalImage = async (file, detectedType) => {
  await fs.mkdir(uploadDirectory, { recursive: true });
  const filename = `${crypto.randomUUID()}${detectedType.extension}`;
  await fs.writeFile(path.join(uploadDirectory, filename), file.buffer, { flag: 'wx' });
  return getLocalUploadResult({ ...file, filename, mimetype: detectedType.mimetype });
};

const buildCloudinarySignature = (params, apiSecret) => {
  const source = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return crypto.createHash('sha1').update(`${source}${apiSecret}`).digest('hex');
};

const uploadToCloudinary = async (file, env = process.env) => {
  if (!isCloudinaryConfigured(env)) {
    const error = new Error('Cloudinary chua duoc cau hinh day du');
    error.status = 500;
    error.code = 'CLOUDINARY_NOT_CONFIGURED';
    throw error;
  }

  if (!globalThis.fetch || !globalThis.FormData || !globalThis.Blob) {
    const error = new Error('Runtime Node.js chua ho tro fetch/FormData/Blob de upload Cloudinary');
    error.status = 500;
    error.code = 'CLOUDINARY_RUNTIME_UNSUPPORTED';
    throw error;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = env.CLOUDINARY_FOLDER || 'souvenirshop';
  const paramsToSign = { folder, timestamp };
  const signature = buildCloudinarySignature(paramsToSign, env.CLOUDINARY_API_SECRET);
  const formData = new FormData();
  const detectedType = validateImageContent(file);
  const filename = `${crypto.randomUUID()}${detectedType.extension}`;

  formData.append('file', new Blob([file.buffer], { type: detectedType.mimetype }), filename);
  formData.append('api_key', env.CLOUDINARY_API_KEY);
  formData.append('timestamp', String(timestamp));
  formData.append('folder', folder);
  formData.append('signature', signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`;
  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error?.message || 'Khong the upload anh len Cloudinary');
    error.status = response.status >= 400 && response.status < 600 ? response.status : 502;
    error.code = 'CLOUDINARY_UPLOAD_FAILED';
    error.details = payload.error || payload;
    throw error;
  }

  return {
    provider: 'cloudinary',
    url: payload.secure_url || payload.url,
    publicId: payload.public_id,
    filename,
    mimetype: detectedType.mimetype,
    size: payload.bytes || file.size,
    width: payload.width,
    height: payload.height,
  };
};

const uploadImage = async (file, env = process.env) => {
  const provider = getUploadProvider(env);
  const detectedType = validateImageContent(file);

  if (provider === 'local') return saveLocalImage(file, detectedType);
  if (provider !== 'cloudinary') {
    const error = new Error(`Upload provider khong duoc ho tro: ${provider}`);
    error.status = 400;
    error.code = 'UPLOAD_PROVIDER_UNSUPPORTED';
    throw error;
  }

  return uploadToCloudinary(file, env);
};

module.exports = {
  buildCloudinarySignature,
  detectImageType,
  getLocalUploadResult,
  getUploadProvider,
  isCloudinaryConfigured,
  uploadImage,
  uploadToCloudinary,
  validateImageContent,
};

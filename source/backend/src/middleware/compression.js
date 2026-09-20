const zlib = require('zlib');

const compressibleTypes = [
  'application/json',
  'application/javascript',
  'text/css',
  'text/html',
  'text/javascript',
  'text/plain',
];

const shouldCompress = (req, res) => {
  if (!/\bgzip\b/.test(req.headers['accept-encoding'] || '')) return false;
  if (res.getHeader('Content-Encoding')) return false;

  const contentType = String(res.getHeader('Content-Type') || '');
  return compressibleTypes.some((type) => contentType.includes(type));
};

const compression = (req, res, next) => {
  if (req.path.startsWith('/uploads')) return next();

  const chunks = [];
  const originalEnd = res.end.bind(res);

  res.write = (chunk, encoding, callback) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
    if (typeof callback === 'function') callback();
    return true;
  };

  res.end = (chunk, encoding, callback) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));

    const body = Buffer.concat(chunks);
    if (!body.length || res.statusCode === 204 || res.statusCode === 304 || !shouldCompress(req, res)) {
      res.setHeader('Content-Length', String(body.length));
      return originalEnd(body, encoding, callback);
    }

    zlib.gzip(body, (err, compressed) => {
      if (err) return originalEnd(body, encoding, callback);

      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      res.setHeader('Content-Length', String(compressed.length));
      return originalEnd(compressed, encoding, callback);
    });

    return res;
  };

  next();
};

module.exports = compression;

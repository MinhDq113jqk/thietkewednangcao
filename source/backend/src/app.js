const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const sellerProductRoutes = require('./routes/sellerProduct.routes');
const shopRoutes = require('./routes/shop.routes');
const orderRoutes = require('./routes/order.routes');
const sellerOrderRoutes = require('./routes/sellerOrder.routes');
const adminRoutes = require('./routes/admin.routes');
const uploadRoutes = require('./routes/upload.routes');
const shippingRoutes = require('./routes/shipping.routes');
const paymentRoutes = require('./routes/payment.routes');
const assistantRoutes = require('./routes/assistant.routes');
const conversationRoutes = require('./routes/conversation.routes');
const cultureRoutes = require('./routes/culture.routes');
const { createCorsOptions } = require('./config/cors');
const compression = require('./middleware/compression');
const createRateLimit = require('./middleware/rateLimit');
const requestContext = require('./middleware/requestContext');
const requestLogger = require('./middleware/requestLogger');
const { errorHandler, errorResponseFormatter, notFoundHandler } = require('./middleware/errorResponse');
const { assertAuthSecrets } = require('./utils/authTokens');

const app = express();

assertAuthSecrets();

app.use(requestContext);
app.use(requestLogger);
app.use(errorResponseFormatter);
app.use(helmet());
app.use(cors(createCorsOptions()));
app.use(compression);
app.use('/api', createRateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX || 300),
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/seller/products', sellerProductRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/seller/orders', sellerOrderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/culture', cultureRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;

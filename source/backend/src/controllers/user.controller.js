const bcrypt = require('bcryptjs');
const Address = require('../models/Address');
const User = require('../models/User');

/* GET /api/users/profile */
exports.getProfile = (req, res) => {
  const { id, name, email, phone, avatar, role } = req.user;
  res.json({ id, name, email, phone, avatar, role });
};

/* PUT /api/users/profile */
exports.updateProfile = async (req, res) => {
  const { name, phone } = req.body;
  // avatar upload sẽ xử lý ở Phase 7
  await req.user.update({ name, phone });
  res.json({ message: 'Cập nhật thành công', user: req.user });
};

/* GET /api/users/addresses */
exports.getAddresses = async (req, res) => {
  const addresses = await Address.findAll({ where: { userId: req.user.id } });
  res.json(addresses);
};

/* POST /api/users/addresses */
exports.addAddress = async (req, res) => {
  const { name, phone, detail, district, city, isDefault } = req.body;
  if (isDefault) {
    await Address.update({ isDefault: false }, { where: { userId: req.user.id } });
  }
  const addr = await Address.create({ userId: req.user.id, name, phone, detail, district, city, isDefault: !!isDefault });
  res.status(201).json(addr);
};

/* PUT /api/users/addresses/:id */
exports.updateAddress = async (req, res) => {
  const addr = await Address.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!addr) return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
  const { name, phone, detail, district, city, isDefault } = req.body;
  if (isDefault) {
    await Address.update({ isDefault: false }, { where: { userId: req.user.id } });
  }
  await addr.update({ name, phone, detail, district, city, isDefault: !!isDefault });
  res.json(addr);
};

/* DELETE /api/users/addresses/:id */
exports.deleteAddress = async (req, res) => {
  const addr = await Address.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!addr) return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
  await addr.destroy();
  res.json({ message: 'Đã xóa địa chỉ' });
};

/* PUT /api/users/password */
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Thiếu mật khẩu hiện tại hoặc mật khẩu mới' });
  }

  if (String(newPassword).length < 8) {
    return res.status(400).json({ message: 'Mật khẩu mới tối thiểu 8 ký tự' });
  }

  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });

  const hashed = await bcrypt.hash(newPassword, 12);
  await user.update({ password: hashed });

  res.json({ message: 'Đã đổi mật khẩu' });
};

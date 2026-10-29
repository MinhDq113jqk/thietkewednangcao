import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';

const bcrypt = require('bcryptjs');
const Address = require('../../models/Address');
const User = require('../../models/User');
const { sequelize } = require('../../database/connection');
const { validateAddress } = require('../../shared/addressValidation.mjs');
const { clearRefreshCookie, matchesAuthVersion, publicUser } = require('../../utils/authTokens');
const { revokeAll } = require('../../services/accountSecurity.service');

/* GET /api/users/profile */

@Injectable()
export class UsersService {
  getProfile(req: AppRequest, res: Response) {
    const { id, name, email, phone, avatar, role, emailVerifiedAt } = req.user;
    res.json({ id, name, email, phone, avatar, role, emailVerifiedAt });
  }

  async updateProfile(req: AppRequest, res: Response) {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('Hồ sơ không hợp lệ');
    const values: { name?: string; phone?: string | null } = {};
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100) throw new BadRequestException('Tên cần từ 1 đến 100 ký tự');
      values.name = body.name.trim();
    }
    if (body.phone !== undefined) {
      if (body.phone === null || body.phone === '') values.phone = null;
      else {
        if (typeof body.phone !== 'string') throw new BadRequestException('Số điện thoại không hợp lệ');
        const phone = body.phone.trim().replace(/[\s().-]/g, '');
        if (!/^\+?\d{9,15}$/.test(phone)) throw new BadRequestException('Số điện thoại cần từ 9 đến 15 chữ số');
        values.phone = phone;
      }
    }
    if (!Object.keys(values).length) throw new BadRequestException('Thiếu thông tin cần cập nhật');
    await req.user.update(values);
    res.json({ message: 'Cập nhật thành công', user: publicUser(req.user) });
  }

  async getAddresses(req: AppRequest, res: Response) {
    const addresses = await Address.findAll({ where: { userId: req.user.id }, order: [['isDefault', 'DESC'], ['createdAt', 'ASC'], ['id', 'ASC']] });
    res.json(addresses);
  }

  async addAddress(req: AppRequest, res: Response) {
    const validation = validateAddress(req.body);
    if (!validation.valid) throw new BadRequestException({ message: 'Địa chỉ không hợp lệ', details: validation.errors });
    const addr = await sequelize.transaction(async (transaction) => {
      await User.findByPk(req.user.id, { transaction, lock: transaction.LOCK.UPDATE });
      const count = await Address.count({ where: { userId: req.user.id }, transaction });
      const isDefault = validation.value.isDefault || count === 0;
      if (isDefault) await Address.update({ isDefault: false }, { where: { userId: req.user.id }, transaction });
      return Address.create({ ...validation.value, isDefault, userId: req.user.id }, { transaction });
    });
    res.status(201).json(addr);
  }

  async updateAddress(req: AppRequest, res: Response) {
    const validation = validateAddress(req.body);
    if (!validation.valid) throw new BadRequestException({ message: 'Địa chỉ không hợp lệ', details: validation.errors });
    const addr = await sequelize.transaction(async (transaction) => {
      await User.findByPk(req.user.id, { transaction, lock: transaction.LOCK.UPDATE });
      const address = await Address.findOne({ where: { id: req.params.id, userId: req.user.id }, transaction });
      if (!address) throw new NotFoundException('Không tìm thấy địa chỉ');
      // Keep the current default until the user explicitly selects another address.
      const isDefault = validation.value.isDefault || address.isDefault;
      if (isDefault) {
        await Address.update({ isDefault: false }, { where: { userId: req.user.id }, transaction });
        await address.reload({ transaction });
      }
      return address.update({ ...validation.value, isDefault }, { transaction });
    });
    res.json(addr);
  }

  async deleteAddress(req: AppRequest, res: Response) {
    await sequelize.transaction(async (transaction) => {
      await User.findByPk(req.user.id, { transaction, lock: transaction.LOCK.UPDATE });
      const addr = await Address.findOne({ where: { id: req.params.id, userId: req.user.id }, transaction });
      if (!addr) throw new NotFoundException('Không tìm thấy địa chỉ');
      await addr.destroy({ transaction });
      if (addr.isDefault) {
        const next = await Address.findOne({ where: { userId: req.user.id }, order: [['createdAt', 'ASC'], ['id', 'ASC']], transaction });
        if (next) await next.update({ isDefault: true }, { transaction });
      }
    });
    res.json({ message: 'Đã xóa địa chỉ' });
  }

  async changePassword(req: AppRequest, res: Response) {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: 'Thiếu mật khẩu hiện tại hoặc mật khẩu mới' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8 || Buffer.byteLength(newPassword) > 72) {
      return res
        .status(400)
        .json({ message: 'Mật khẩu mới cần ít nhất 8 ký tự và tối đa 72 byte' });
    }

    await sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(req.user.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
      if (!user.isActive || !matchesAuthVersion(req.user, user)) {
        throw Object.assign(new Error('Phiên đăng nhập không hợp lệ'), { status: 401 });
      }
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) throw new BadRequestException('Mật khẩu hiện tại không đúng');

      const hashed = await bcrypt.hash(newPassword, 12);
      await revokeAll(user, transaction, hashed);
    });
    clearRefreshCookie(res);

    res.json({ message: 'Đã đổi mật khẩu' });
  }
}

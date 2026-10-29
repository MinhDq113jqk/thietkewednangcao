import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';

const { productPaging, pagedProducts } = require('../../services/productPaging.service');
const { Product, Shop } = require('../../models');



const slugify = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150);

const uniqueSlug = async (name) => {
  const base = slugify(name) || `shop-${Date.now()}`;
  let slug = base;
  let suffix = 1;

  while (await Shop.findOne({ where: { slug } })) {
    slug = `${base}-${suffix++}`;
  }

  return slug;
};

@Injectable()
export class ShopsService {
  async registerShop(req: AppRequest, res: Response) {
    try {
      const existing = await Shop.findOne({ where: { ownerId: req.user.id } });
      if (existing)
        return res.status(409).json({ message: 'Tai khoan da co gian hang' });

      const { name, description, logo, banner, location } = req.body;
      if (!name)
        return res.status(400).json({ message: 'Ten gian hang la bat buoc' });

      const shop = await Shop.create({
        ownerId: req.user.id,
        name,
        slug: await uniqueSlug(name),
        description,
        logo,
        banner,
        location,
        status: 'pending',
      });

      if (req.user.role === 'buyer') await req.user.update({ role: 'seller' });


      res.status(201).json(shop);
    } catch (err) {
      throw err;
    }
  }

  async getShopBySlug(req: AppRequest, res: Response) {
    try {
      const shop = await Shop.findOne({ where: { slug: req.params.slug } });
      if (!shop || shop.status !== 'active') {
        return res.status(404).json({ message: 'Khong tim thay gian hang' });
      }

      res.json(shop);
    } catch (err) {
      throw err;
    }
  }

  async getShopProducts(req: AppRequest, res: Response) {
    try {
      const shop = await Shop.findOne({ where: { slug: req.params.slug } });
      if (!shop || shop.status !== 'active') {
        return res.status(404).json({ message: 'Khong tim thay gian hang' });
      }

      res.json(await pagedProducts(Product, productPaging(req.query, shop.id)));
    } catch (err) {
      throw err;
    }
  }

  async getMyShop(req: AppRequest, res: Response) {
    try {
      const shop = await Shop.findOne({ where: { ownerId: req.user.id } });
      if (!shop)
        return res.status(404).json({ message: 'Ban chua co gian hang' });

      res.json(shop);
    } catch (err) {
      throw err;
    }
  }

  async updateMyShop(req: AppRequest, res: Response) {
    try {
      const shop = await Shop.findOne({ where: { ownerId: req.user.id } });
      if (!shop)
        return res.status(404).json({ message: 'Ban chua co gian hang' });

      const allowed = ['name', 'description', 'logo', 'banner', 'location'];
      const payload: Record<string, any> = {};
      allowed.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(req.body, key))
          payload[key] = req.body[key];
      });

      if (payload.name && payload.name !== shop.name) {
        payload.slug = await uniqueSlug(payload.name);
      }

      await shop.update(payload);
      res.json(shop);
    } catch (err) {
      throw err;
    }
  }
}

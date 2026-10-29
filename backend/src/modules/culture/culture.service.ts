import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';

const { Op } = require('sequelize');
const { CraftVillage, Product, Region, Shop } = require('../../models');
const {
  findNearbyVillages,
  parseGeoQuery,
} = require('../../services/cultureMap.service');
const { normalizeProduct } = require('../../shared/productCatalog.mjs');

const publicShopInclude = {
  model: Shop,
  as: 'shop',
  attributes: [
    'id',
    'name',
    'slug',
    'logo',
    'rating',
    'reviewCount',
    'location',
  ],
  where: { status: 'active' },
  required: true,
};

const publicVillageAttributes = [
  'id',
  'regionId',
  'name',
  'slug',
  'summary',
  'foundedYear',
  'latitude',
  'longitude',
  'previewMedia',
  'crafts',
  'artisans',
];

@Injectable()
export class CultureService {
  async listRegions(_req: AppRequest, res: Response) {
    try {
      const regions = await Region.findAll({
        where: { isFeatured: true },
        attributes: [
          'id',
          'name',
          'slug',
          'shortDescription',
          'centerLat',
          'centerLng',
          'mapX',
          'mapY',
          'heroMedia',
          'theme',
        ],
        include: [
          {
            model: CraftVillage,
            as: 'villages',
            attributes: publicVillageAttributes,
            where: { isFeatured: true },
            required: false,
          },
        ],
        order: [
          ['mapY', 'ASC'],
          [{ model: CraftVillage, as: 'villages' }, 'name', 'ASC'],
        ],
      });

      res.json({ items: regions, total: regions.length });
    } catch (error) {
      throw error;
    }
  }

  async getRegion(req: AppRequest, res: Response) {
    try {
      const region = await Region.findOne({
        where: { slug: req.params.slug, isFeatured: true },
      });
      if (!region)
        return res.status(404).json({ message: 'Không tìm thấy vùng văn hóa' });

      const villages = await CraftVillage.findAll({
        where: { regionId: region.id, isFeatured: true },
        attributes: publicVillageAttributes,
        order: [['name', 'ASC']],
      });
      const villageIds = villages.map((village) => village.id);
      const products = villageIds.length
        ? await Product.findAll({
            where: {
              isActive: true, moderationHidden: false,
              craftVillageId: { [Op.in]: villageIds },
            },
            include: [
              publicShopInclude,
              {
                model: CraftVillage,
                as: 'craftVillage',
                attributes: ['id', 'name', 'slug'],
              },
            ],
            order: [
              ['sold', 'DESC'],
              ['createdAt', 'DESC'],
            ],
            limit: 8,
          })
        : [];

      res.json({
        ...region.toJSON(),
        villages,
        products: products.map(normalizeProduct),
      });
    } catch (error) {
      throw error;
    }
  }

  async listCultureProducts(req: AppRequest, res: Response) {
    try {
      const craftVillageId = String(
        req.query.craftVillageId || req.query.villageId || '',
      ).trim();
      const geoQuery = parseGeoQuery(req.query);
      if (geoQuery?.error)
        return res.status(400).json({ message: geoQuery.error });
      if (!craftVillageId && !geoQuery) {
        return res
          .status(400)
          .json({ message: 'Cần craftVillageId hoặc cặp tọa độ lat/lng' });
      }

      let nearby = [];
      if (craftVillageId) {
        const village = await CraftVillage.findByPk(craftVillageId, {
          attributes: publicVillageAttributes,
        });
        if (!village)
          return res.status(404).json({ message: 'Không tìm thấy làng nghề' });
        nearby = [{ village, distanceKm: 0 }];
      } else {
        const villages = await CraftVillage.findAll({
          where: { isFeatured: true },
          attributes: publicVillageAttributes,
        });
        nearby = findNearbyVillages(villages, geoQuery);
      }

      const villageIds = nearby.map((item) => item.village.id);
      const limit = Math.min(
        Math.max(Number.parseInt(String(req.query.limit || ''), 10) || 24, 1),
        50,
      );
      const products = villageIds.length
        ? await Product.findAll({
            where: { isActive: true, moderationHidden: false, craftVillageId: { [Op.in]: villageIds } },
            include: [
              publicShopInclude,
              {
                model: CraftVillage,
                as: 'craftVillage',
                attributes: ['id', 'name', 'slug'],
              },
            ],
            order: [
              ['sold', 'DESC'],
              ['createdAt', 'DESC'],
            ],
            limit,
          })
        : [];
      const distances = new Map<string, number>(
        nearby.map((item) => [item.village.id, item.distanceKm]),
      );

      res.json({
        items: products.map((product) => ({
          ...normalizeProduct(product),
          distanceKm: Number(
            (distances.get(product.craftVillageId) || 0).toFixed(1),
          ),
        })),
        total: products.length,
        villages: nearby.map(({ village, distanceKm: villageDistance }) => ({
          ...village.toJSON(),
          distanceKm: Number(villageDistance.toFixed(1)),
        })),
        query: craftVillageId ? { craftVillageId } : geoQuery,
      });
    } catch (error) {
      throw error;
    }
  }
}

import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';

const { loadCheckoutQuote } = require('../../services/checkoutQuote.service');

@Injectable()
export class ShippingService {
  async estimate(req: AppRequest, res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const { quote } = await loadCheckoutQuote({
        city: req.body.city || req.query.city,
        items: req.body.items || req.query.items,
      });
      res.json(quote);
    } catch (error) {
      throw error;
    }
  }
}

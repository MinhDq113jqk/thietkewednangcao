import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import type { AppRequest } from '../../common/types/app-request';

const uploadService = require('../../services/upload.service');

@Injectable()
export class UploadsService {
  async uploadImage(req: AppRequest, res: Response) {
    if (!req.file) {
      return res.status(400).json({ message: 'Chua co file anh' });
    }

    try {
      const result = await uploadService.uploadImage(req.file);
      return res.status(201).json(result);
    } catch (err) {
      throw err;
    }
  }
}

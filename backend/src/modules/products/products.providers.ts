import { DATABASE_MODELS } from '../../database/database.module';

export const PRODUCT_REPOSITORY = 'PRODUCT_REPOSITORY';
export const SHOP_REPOSITORY = 'SHOP_REPOSITORY';
export const ORDER_ITEM_REPOSITORY = 'ORDER_ITEM_REPOSITORY';
export const REVIEW_REPOSITORY = 'REVIEW_REPOSITORY';

export const productProviders = [
  {
    provide: PRODUCT_REPOSITORY,
    useFactory: (models: any) => models.Product,
    inject: [DATABASE_MODELS],
  },
  {
    provide: SHOP_REPOSITORY,
    useFactory: (models: any) => models.Shop,
    inject: [DATABASE_MODELS],
  },
  {
    provide: ORDER_ITEM_REPOSITORY,
    useFactory: (models: any) => models.OrderItem,
    inject: [DATABASE_MODELS],
  },
  {
    provide: REVIEW_REPOSITORY,
    useFactory: (models: any) => models.Review,
    inject: [DATABASE_MODELS],
  },
];

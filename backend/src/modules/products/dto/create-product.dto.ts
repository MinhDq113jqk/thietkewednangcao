// Validation uses the shared catalog rules, including salePrice <= price.
export class CreateProductDto {
  name: string;
  price: number | string;
  category: string;
  stock?: number | string;
  salePrice?: number | string | null;
  description?: string;
  images?: string[];
  isActive?: boolean;
  isFlashSale?: boolean;
}

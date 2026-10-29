import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ProductInputPipe implements PipeTransform {
  transform(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Du lieu san pham khong hop le');
    }
    return value;
  }
}

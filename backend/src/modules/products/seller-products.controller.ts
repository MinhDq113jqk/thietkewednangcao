import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AppRequest } from '../../common/types/app-request';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import { ProductInputPipe } from './pipes/product-input.pipe';
const { saveVariant, updateVariantStock, readInventory } = require('../../services/inventory.service');
const { updateStock } = require('../../services/productStock.service');

@Controller('api/seller/products')
@UseGuards(AuthGuard, RolesGuard)
@Roles('seller', 'admin')
export class SellerProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  list(@Req() request: AppRequest) {
    return this.service.listSellerProducts(request.user.id, request.query);
  }

  @Get('inventory')
  inventory(@Req() request: AppRequest) { return readInventory(request.user.id, request.query); }

  @Post(':id/variants')
  createVariant(@Req() request: AppRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body(ProductInputPipe) body: unknown) {
    return saveVariant(request.user.id, id, null, body);
  }

  @Put(':id/variants/:variantId')
  updateVariant(@Req() request: AppRequest, @Param('id', new ParseUUIDPipe()) id: string, @Param('variantId', new ParseUUIDPipe()) variantId: string, @Body(ProductInputPipe) body: unknown) {
    return saveVariant(request.user.id, id, variantId, body);
  }

  @Put(':id/variants/:variantId/stock')
  variantStock(@Req() request: AppRequest, @Param('id', new ParseUUIDPipe()) id: string, @Param('variantId', new ParseUUIDPipe()) variantId: string, @Body(ProductInputPipe) body: unknown) {
    return updateVariantStock(request.user.id, id, variantId, body);
  }

  @Get(':id')
  detail(@Req() request: AppRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.getSellerProduct(request.user.id, id);
  }

  @Post()
  create(
    @Req() request: AppRequest,
    @Body(ProductInputPipe) body: CreateProductDto,
  ) {
    return this.service.createSellerProduct(request.user.id, body);
  }

  @Put(':id')
  update(
    @Req() request: AppRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(ProductInputPipe) body: UpdateProductDto,
  ) {
    return this.service.updateSellerProduct(request.user.id, id, body);
  }

  @Put(':id/stock')
  updateStock(
    @Req() request: AppRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(ProductInputPipe) body: unknown,
  ) {
    return updateStock(request.user.id, id, body);
  }

  @Put(':id/restore')
  restore(
    @Req() request: AppRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.restoreSellerProduct(request.user.id, id);
  }

  @Delete(':id/permanent')
  deletePermanently(
    @Req() request: AppRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.permanentDeleteSellerProduct(request.user.id, id);
  }

  @Delete(':id')
  remove(
    @Req() request: AppRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.deleteSellerProduct(request.user.id, id);
  }
}

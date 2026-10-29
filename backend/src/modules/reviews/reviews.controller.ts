import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import type { AppRequest } from '../../common/types/app-request';
import { ReviewsService } from './reviews.service';

@Controller('api/products/:productId/reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}
  @Get()
  list(@Param('productId', new ParseUUIDPipe()) productId: string, @Query() query: Record<string, unknown>) {
    return this.service.listProductReviews(productId, query);
  }
}

@Controller('api/orders/:orderId/reviews')
@UseGuards(AuthGuard)
export class OrderReviewsController {
  constructor(private readonly service: ReviewsService) {}
  @Get()
  list(@Req() req: AppRequest, @Param('orderId', new ParseUUIDPipe()) orderId: string) {
    return this.service.listOrderReviews(req.user.id, orderId);
  }
  @Post()
  create(@Req() req: AppRequest, @Param('orderId', new ParseUUIDPipe()) orderId: string, @Body() input: unknown) {
    return this.service.createReview(req.user.id, orderId, input);
  }
}

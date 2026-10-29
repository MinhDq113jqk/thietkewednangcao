import { Module } from '@nestjs/common';
import { ReviewsController, OrderReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({ controllers: [ReviewsController, OrderReviewsController], providers: [ReviewsService] })
export class ReviewsModule {}

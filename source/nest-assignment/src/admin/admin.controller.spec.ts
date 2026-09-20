import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { UserRole } from '../auth/entities/user.entity';

describe('AdminController Unit Tests', () => {
  let controller: AdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
    }).compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /admin/profile', () => {
    it('should return admin profile response payload with user info', () => {
      const mockRequest = {
        user: {
          sub: 1,
          username: 'admin_super',
          role: UserRole.ADMIN,
        },
      } as any;

      const response = controller.profile(mockRequest);

      expect(response).toEqual({
        message: 'Bạn đã vượt qua JWT Guard và Role Guard',
        user: mockRequest.user,
        note: 'Đây là endpoint minh họa cho bài tập, không phải màn quản trị của SouvenirShop.',
      });
    });
  });
});

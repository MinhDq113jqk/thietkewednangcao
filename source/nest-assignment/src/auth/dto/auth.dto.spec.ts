import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from './register.dto';
import { LoginDto } from './login.dto';

describe('Auth DTO Validation Tests', () => {
  describe('RegisterDto', () => {
    const toDto = (plain: object) => plainToInstance(RegisterDto, plain);

    it('should succeed with valid username and password at standard lengths', async () => {
      const dto = toDto({
        username: 'valid_user.name-123',
        password: 'ValidPassword123!',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    describe('Boundary Values: username length', () => {
      it('should pass with minimum length of 3 characters', async () => {
        const dto = toDto({ username: 'abc', password: 'ValidPassword123' });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass with maximum length of 50 characters', async () => {
        const dto = toDto({ username: 'a'.repeat(50), password: 'ValidPassword123' });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail when username is shorter than 3 characters (boundary: 2)', async () => {
        const dto = toDto({ username: 'ab', password: 'ValidPassword123' });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        const usernameError = errors.find((e) => e.property === 'username');
        expect(usernameError?.constraints?.minLength).toBeDefined();
      });

      it('should fail when username is longer than 50 characters (boundary: 51)', async () => {
        const dto = toDto({ username: 'a'.repeat(51), password: 'ValidPassword123' });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        const usernameError = errors.find((e) => e.property === 'username');
        expect(usernameError?.constraints?.maxLength).toBeDefined();
      });
    });

    describe('Username regex validation', () => {
      it('should allow letters, numbers, dot, underscore, and hyphen', async () => {
        const dto = toDto({ username: 'user_name-1.test', password: 'ValidPassword123' });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it.each([
        ['user name', 'space'],
        ['user@mail.com', 'at sign'],
        ['user!test', 'exclamation mark'],
        ['user#hash', 'hash'],
        ['user$dollar', 'dollar'],
        ['user💡icon', 'emoji'],
      ])('should reject username containing %s (%s)', async (invalidUsername) => {
        const dto = toDto({ username: invalidUsername, password: 'ValidPassword123' });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        const usernameError = errors.find((e) => e.property === 'username');
        expect(usernameError?.constraints?.matches).toBe(
          'username chỉ gồm chữ cái, số, dấu chấm, gạch dưới hoặc gạch ngang',
        );
      });
    });

    describe('Boundary Values: password length', () => {
      it('should pass with minimum password length of 8 characters', async () => {
        const dto = toDto({ username: 'validuser', password: '12345678' });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should pass with maximum password length of 72 characters', async () => {
        const dto = toDto({ username: 'validuser', password: 'p'.repeat(72) });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
      });

      it('should fail when password is shorter than 8 characters (boundary: 7)', async () => {
        const dto = toDto({ username: 'validuser', password: '1234567' });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        const passwordError = errors.find((e) => e.property === 'password');
        expect(passwordError?.constraints?.minLength).toBeDefined();
      });

      it('should fail when password exceeds 72 characters (boundary: 73)', async () => {
        const dto = toDto({ username: 'validuser', password: 'p'.repeat(73) });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        const passwordError = errors.find((e) => e.property === 'password');
        expect(passwordError?.constraints?.maxLength).toBeDefined();
      });
    });

    describe('Missing and Type Validation', () => {
      it('should fail when username and password are missing', async () => {
        const dto = toDto({});
        const errors = await validate(dto);
        expect(errors.length).toBe(2);
      });

      it('should fail when non-string values are provided', async () => {
        const dto = toDto({ username: 12345, password: true });
        const errors = await validate(dto);
        const usernameError = errors.find((e) => e.property === 'username');
        const passwordError = errors.find((e) => e.property === 'password');
        expect(usernameError?.constraints?.isString).toBeDefined();
        expect(passwordError?.constraints?.isString).toBeDefined();
      });
    });
  });

  describe('LoginDto', () => {
    const toDto = (plain: object) => plainToInstance(LoginDto, plain);

    it('should succeed with valid credentials', async () => {
      const dto = toDto({ username: 'demouser', password: 'ValidPassword123' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when username is shorter than 3 characters', async () => {
      const dto = toDto({ username: 'ab', password: 'ValidPassword123' });
      const errors = await validate(dto);
      const usernameError = errors.find((e) => e.property === 'username');
      expect(usernameError?.constraints?.minLength).toBeDefined();
    });

    it('should fail when password is shorter than 8 characters', async () => {
      const dto = toDto({ username: 'demouser', password: 'short' });
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError?.constraints?.minLength).toBeDefined();
    });

    it('should fail when password exceeds 72 characters', async () => {
      const dto = toDto({ username: 'demouser', password: 'x'.repeat(73) });
      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError?.constraints?.maxLength).toBeDefined();
    });
  });
});

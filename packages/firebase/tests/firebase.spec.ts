import { createFirebaseConnection } from '../src/index';

describe('FirebaseConnection', () => {
  it('should throw if missing credentials', () => {
    expect(() => createFirebaseConnection({} as any)).toThrow('Firebase connection requires projectId');
  });

  // We can't easily test actual initialization without mocking admin.initializeApp
  it('should parse private key and initialize', () => {
    const admin = require('firebase-admin');
    jest.spyOn(admin, 'initializeApp').mockReturnValue({} as any);
    jest.spyOn(admin.credential, 'cert').mockReturnValue({} as any);

    const app = createFirebaseConnection({
      projectId: 'test',
      clientEmail: 'test@test.com',
      privateKey: 'fake\\nkey'
    } as any);

    expect(app).toBeDefined();
    expect(admin.initializeApp).toHaveBeenCalled();
  });
});

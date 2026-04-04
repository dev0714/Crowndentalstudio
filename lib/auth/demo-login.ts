export type DemoLoginUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

const DEMO_PASSWORDS = new Set(['TestPassword1234!', 'TestPassword123!']);

export function resolveDemoLoginUser(email: string, password: string): DemoLoginUser | null {
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail !== 'test@crowndental.com') {
    return null;
  }

  if (!DEMO_PASSWORDS.has(password)) {
    return null;
  }

  return {
    id: '10c0ec3d-8d87-481e-a34f-f3e9be7c6002',
    email: 'test@crowndental.com',
    fullName: 'Test User',
    role: 'CEO',
  };
}

/**
 * Simulated authentication service interface.
 * Connect to your Python / FastAPI auth endpoints here in production.
 */
export async function loginVendor(email, password) {
  // Replace with real backend API fetch: POST /api/auth/vendor/login
  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  return {
    user: {
      id: 'USR-001',
      name: 'Vendor Account',
      email: email,
      role: 'vendor',
    },
    token: 'mock-jwt-token-vendor',
  };
}

export async function loginAdmin(email, password) {
  // Replace with real backend API fetch: POST /api/auth/admin/login
  if (!email || !password) {
    throw new Error('Admin credentials are required.');
  }

  return {
    user: {
      id: 'ADM-001',
      name: 'VendorGate Admin',
      email: email,
      role: 'admin',
    },
    token: 'mock-jwt-token-admin',
  };
}

export async function registerVendor(userData) {
  // Replace with real backend API fetch: POST /api/auth/vendor/register
  return {
    user: {
      id: `USR-${Date.now()}`,
      name: `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      role: 'vendor',
    },
    token: 'mock-jwt-token-new-vendor',
  };
}
// Imported first by every test file — sets a safe test environment before config loads.
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ||= 'test_secret_that_is_long_enough_for_tests_123';
process.env.MFA_ENCRYPTION_KEY ||= '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.CLIENT_URL ||= 'http://localhost:5173';

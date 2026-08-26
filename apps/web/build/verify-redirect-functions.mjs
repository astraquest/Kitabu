import assert from 'node:assert/strict';
import { onRequest as resetPassword } from '../functions/reset-password.js';
import { onRequest as verifyEmail } from '../functions/verify-email.js';

const query = '?token=abcdefghijklmnopqrstuvwxyz123456&next=%2Fdashboard%3Ftab%3D1&empty=';

for (const [handler, path] of [
  [resetPassword, '/reset-password'],
  [verifyEmail, '/verify-email']
]) {
  const response = await handler({
    request: new Request(`https://kitabu.ai${path}${query}`)
  });
  assert.equal(response.status, 308, `${path} must remain a permanent redirect`);
  assert.equal(
    response.headers.get('location'),
    `https://app.kitabu.ai${path}${query}`,
    `${path} must preserve the complete incoming query string`
  );
}

console.log('Pages redirect-function check passed (status, Location, and query preservation).');

import test from 'node:test';
import assert from 'node:assert/strict';
import { isPortalRoute } from './portal-navigation.ts';

test('isPortalRoute includes the settings page', () => {
  assert.equal(isPortalRoute('/settings'), true);
  assert.equal(isPortalRoute('/settings/openai'), true);
});

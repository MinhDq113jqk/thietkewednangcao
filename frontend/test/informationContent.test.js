import assert from 'node:assert/strict';
import { test } from 'node:test';
import { informationContent, resolveInformationContent } from '../src/utils/informationContent.js';

test('US38 information pages select complete content and safely fall back for unknown keys', () => {
  for (const key of ['about', 'policy', 'contact']) {
    const page = resolveInformationContent(key);
    assert.equal(page, informationContent[key]);
    assert.ok(page.title && page.intro && page.sections.length > 0);
    for (const section of page.sections) assert.ok(section.title && section.body);
  }
  for (const key of [undefined, 'missing', 'constructor', '__proto__']) assert.equal(resolveInformationContent(key), informationContent.about);
});
test('US38 contact actions use the implemented support route, not unverified mailboxes', () => {
  const actions = informationContent.contact.sections.filter(section => section.action).map(section => section.action);
  assert.equal(actions.length, 2);
  for (const action of actions) { assert.equal(action.href, '/support'); assert.ok(action.label); }
});

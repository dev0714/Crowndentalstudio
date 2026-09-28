import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseAiVerdicts } from './ai-classify-parse';

test('parseAiVerdicts accepts both bare arrays and {emails: []} and normalises groups', () => {
  const content = JSON.stringify({
    emails: [
      { uid: '1', group: 'Accounts', important: true, reason: 'Credit card statement', sender_kind: 'Bank' },
      { uid: '2', group: 'marketing', important: 'false', reason: 'Domain registrar promotion', sender_kind: 'Domain registrar' },
      { uid: '3', group: 'nonsense', important: true, reason: 'x' },
      { uid: '9', group: 'lab', important: true, reason: 'not in batch' },
      { uid: '1', group: 'other', important: false, reason: 'duplicate' },
    ],
  });
  const verdicts = parseAiVerdicts(content, ['1', '2', '3']);
  assert.deepEqual(verdicts.map((v) => [v.uid, v.group, v.important]), [['1', 'accounts', true], ['2', 'marketing', false]]);
  assert.equal(verdicts[0].senderKind, 'Bank');
  assert.deepEqual(parseAiVerdicts('not json', ['1']), []);
  assert.deepEqual(parseAiVerdicts(JSON.stringify([{ uid: '1', group: 'patient enquiries', important: true, reason: 'r' }]), ['1'])[0].group, 'patient_enquiries');
});

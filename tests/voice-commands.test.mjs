import test from 'node:test';
import assert from 'node:assert/strict';
import { matchVoiceCommand } from '../src/voiceCommands.ts';

test('English commands select their intended screens', () => {
  for (const [phrase,target,facility] of [
    ['Pay bills','bills'], ['Please show me my bills.','bills'],
    ['Could you open the contacts please?','contacts'], ['Show map','routes'],
    ['Take me to the residential map','routes'], ['Go home!','home'],
    ['Book gym','booking','Gym'], ['Book sauna','booking','Sauna'],
    ['Book court','booking','Court'], ['Report an issue','report'],
    ['Request assistance','services'], ['My bookings','history'],
    ['Notices','notice'], ['Open settings','profile'], ['SOS','safety'],
  ]) {
    const command = matchVoiceCommand(phrase);
    assert.equal(command?.target,target,phrase);
    if (facility) assert.equal(command.facility,facility);
  }
});
test('Unrelated, negated and multi-command speech does not navigate', () => {
  for (const phrase of ['', 'do not open bills', "don't pay bills", 'contacts and pay bills',
    'I was talking about a map yesterday', 'submit report', 'confirm payment', 'send SOS',
    'cancel booking', 'buka peta', 'homework']) assert.equal(matchVoiceCommand(phrase),null,phrase);
});

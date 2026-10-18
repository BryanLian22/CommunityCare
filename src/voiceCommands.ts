export type VoiceCommand = { target: 'home' | 'community' | 'market' | 'safety' | 'routes' | 'bills' | 'booking' | 'contacts' | 'report' | 'services' | 'notice' | 'profile' | 'history'; label: string; facility?: string };
const commands: [string[], VoiceCommand][] = [
  [['home', 'home screen', 'go home'], { target: 'home', label: 'Home' }],
  [['community', 'community hub'], { target: 'community', label: 'Community' }],
  [['market', 'marketplace'], { target: 'market', label: 'Market' }],
  [['safety', 'emergency', 'sos'], { target: 'safety', label: 'Safety' }],
  [['map', 'show map', 'routes', 'accessible map', 'residential map'], { target: 'routes', label: 'Residential map' }],
  [['bills', 'my bills', 'pay bills', 'pay bill', 'pay my bills', 'balance', 'outstanding balance'], { target: 'bills', label: 'Bills & payments' }],
  [['book gym', 'gym', 'gym booking'], { target: 'booking', label: 'Gym booking', facility: 'Gym' }],
  [['book sauna', 'sauna', 'sauna booking'], { target: 'booking', label: 'Sauna booking', facility: 'Sauna' }],
  [['book court', 'court', 'court booking'], { target: 'booking', label: 'Court booking', facility: 'Court' }],
  [['book facility', 'book a facility', 'booking', 'facilities'], { target: 'booking', label: 'Facility booking', facility: 'Gym' }],
  [['contacts', 'contact directory', 'management contacts'], { target: 'contacts', label: 'Contacts' }],
  [['report issue', 'report an issue', 'report a problem', 'report problem'], { target: 'report', label: 'Report an issue' }],
  [['request assistance', 'assistance', 'help', 'services'], { target: 'services', label: 'Request assistance' }],
  [['notices', 'notice', 'announcements'], { target: 'notice', label: 'Notices' }],
  [['profile', 'settings', 'my profile'], { target: 'profile', label: 'Profile' }],
  [['my bookings', 'booking history', 'my reports', 'my activity'], { target: 'history', label: 'My activity' }],
];
/** Match one whole command, never a keyword buried in unrelated or negated speech. */
export function matchVoiceCommand(transcript: string): VoiceCommand | null {
  let text = transcript.toLowerCase().replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim();
  text = text.replace(/^please /, '').replace(/ please$/, '');
  text = text.replace(/^(can you |could you |i want to |i would like to )/, '').replace(/^please /, '');
  text = text.replace(/^(take me to |navigate to |go to |open |show me |show )/, '');
  text = text.replace(/^the /, '');
  return commands.find(([aliases]) => aliases.includes(text))?.[1] ?? null;
}

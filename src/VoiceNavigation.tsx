import { useEffect, useRef, useState } from 'react';
import { matchVoiceCommand, type VoiceCommand } from './voiceCommands';
import './VoiceNavigation.css';

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; abort(): void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
export default function VoiceNavigation({ onNavigate }: { onNavigate: (command: VoiceCommand, transcript: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const recognition = useRef<Recognition | null>(null);
  const timeout = useRef<number | undefined>(undefined);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const [heard, setHeard] = useState('');
  const supported = !!((window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition);
  function stop() {
    const current = recognition.current;
    recognition.current = null;
    window.clearTimeout(timeout.current);
    if (current) { current.onresult = null; current.onerror = null; current.onend = null; current.abort(); }
  }
  function close() { stop(); setListening(false); dialog.current?.close(); }
  useEffect(() => {
    const hide = () => { if (document.hidden) { stop(); setListening(false); setMessage('Listening stopped. Tap Listen to try again.'); } };
    document.addEventListener('visibilitychange', hide);
    return () => { stop(); document.removeEventListener('visibilitychange', hide); };
  }, []);
  function listen() {
    stop(); setHeard('');
    const Constructor = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
    if (!Constructor) { setMessage('Voice recognition is not available in this browser. Use the app buttons to navigate.'); return; }
    if (!window.isSecureContext) { setMessage('Voice commands need a secure HTTPS connection or localhost.'); return; }
    const current = new Constructor();
    recognition.current = current;
    current.lang = 'en-US'; current.continuous = false; current.interimResults = false; current.maxAlternatives = 1;
    setListening(true); setMessage('Listening in English… Say one command.');
    current.onresult = event => {
      if (recognition.current !== current) return;
      const result = event.results[0];
      if (!result?.isFinal) return;
      const text = result[0].transcript.trim();
      stop(); setListening(false); setHeard(text);
      const command = matchVoiceCommand(text);
      if (!command) { setMessage('Command not recognised. Try one of the examples below.'); return; }
      dialog.current?.close();
      onNavigate(command, text);
    };
    current.onerror = event => {
      if (recognition.current !== current) return;
      stop(); setListening(false);
      const errors: Record<string, string> = {
        'not-allowed': 'Microphone access was denied. Allow microphone access in your browser settings, then try again.',
        'service-not-allowed': 'Speech recognition is blocked by this browser. Use the app buttons to navigate.',
        'audio-capture': 'No microphone is available. Check your microphone connection.',
        'no-speech': 'No speech was heard. Tap Listen and say one command.',
        'network': 'Speech recognition could not connect. Check your internet connection and try again.',
        'language-not-supported': 'English speech recognition is unavailable in this browser.',
      };
      setMessage(errors[event.error] || 'Voice recognition stopped. Tap Listen to try again.');
    };
    current.onend = () => {
      if (recognition.current !== current) return;
      stop(); setListening(false); setMessage('No command was received. Tap Listen to try again.');
    };
    try {
      current.start();
      timeout.current = window.setTimeout(() => {
        if (recognition.current !== current) return;
        stop(); setListening(false); setMessage('Listening timed out. Tap Listen to try again.');
      }, 15000);
    } catch { stop(); setListening(false); setMessage('Could not start the microphone. Check browser permission and try again.'); }
  }
  return <>
    <button type="button" className="round-button voice-launch" aria-label="English voice commands" title="English voice commands" onClick={() => { dialog.current?.showModal(); listen(); }}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>
    </button>
    <dialog ref={dialog} className="voice-dialog" aria-labelledby="voice-heading" onCancel={e => { e.preventDefault(); close(); }} onClose={() => { stop(); setListening(false); }}>
      <div className="voice-heading"><h2 id="voice-heading">Voice commands</h2><button type="button" onClick={close} autoFocus>Close</button></div>
      <p className="voice-status" role="status">{message}</p>
      {heard && <p className="voice-heard">Heard: “{heard}”</p>}
      <p>Say a command in English to open a screen.</p>
      <ul><li>“Pay bills”</li><li>“Book gym”, “Book sauna” or “Book court”</li><li>“Contacts”</li><li>“Show map”</li><li>“Report issue”</li><li>“Go home”</li><li>“Notices” or “My bookings”</li></ul>
      <button type="button" className="voice-listen" disabled={!supported} onClick={() => { if (listening) { stop(); setListening(false); setMessage('Listening stopped.'); } else listen(); }}>{listening ? 'Stop listening' : 'Listen'}</button>
      <p className="voice-note">Your browser may process speech online. Listening stops after one command. Commands open screens; they do not submit requests or make payments.</p>
    </dialog>
  </>;
}

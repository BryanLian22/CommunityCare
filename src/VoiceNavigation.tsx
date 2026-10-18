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
    setListening(true); setMessage('Listening… Say where you’d like to go.');
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
      <header className="voice-heading">
        <div><span className="voice-eyebrow">COMMUNITYCARE ASSISTANT</span><h2 id="voice-heading">Where would you like to go?</h2></div>
        <button className="voice-close" type="button" onClick={close} autoFocus aria-label="Close voice commands"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button>
      </header>
      <div className="voice-body">
        <section className={`voice-listening-card ${listening ? 'is-listening' : ''}`} aria-label="Microphone status">
          <div className="voice-orb" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg></div>
          <span className="voice-language">ENGLISH · ONE COMMAND AT A TIME</span>
          <p className="voice-status" role="status">{message}</p>
          {listening && <div className="voice-wave" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/></div>}
          {heard && <p className="voice-heard"><span>YOU SAID</span>“{heard}”</p>}
        </section>
        <div className="voice-examples-heading"><h3>Try saying</h3><span>Speak naturally</span></div>
        <ul className="voice-examples">
          {[['Pay bills', 'Bills & balance'], ['Book gym', 'Facility bookings'], ['Contacts', 'People & management'], ['Show map', 'Residential navigator'], ['Report issue', 'Maintenance & safety'], ['Go home', 'Your dashboard']].map(([phrase, caption]) => <li key={phrase}><span className="voice-example-quote" aria-hidden="true">“</span><div><b>{phrase}</b><span>{caption}</span></div></li>)}
        </ul>
        <details className="voice-more"><summary>More commands</summary><p>Book sauna · Book court · Notices · My bookings · Request assistance · Profile · Community · Market · Safety</p></details>
      </div>
      <footer className="voice-footer">
        <button type="button" className="voice-listen" disabled={!supported} onClick={() => { if (listening) { stop(); setListening(false); setMessage('Listening stopped. Tap the button below when you’re ready.'); } else listen(); }}><span aria-hidden="true">{listening ? '■' : '●'}</span>{listening ? 'Stop listening' : 'Start listening'}</button>
        <details className="voice-privacy"><summary>About voice commands</summary><p>Your browser may process speech online. Listening stops after one command. Commands open screens; they do not submit requests or make payments.</p></details>
      </footer>
    </dialog>
  </>;
}

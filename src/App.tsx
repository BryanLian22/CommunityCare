import { useState, useEffect, useRef, type ReactNode } from "react";

type IconName =
  | "alert"
  | "arrow"
  | "bell"
  | "building"
  | "calendar"
  | "check"
  | "chevron"
  | "cloud"
  | "community"
  | "contact"
  | "dumbbell"
  | "elevator"
  | "eye"
  | "home"
  | "location"
  | "map"
  | "notice"
  | "phone"
  | "plus"
  | "report"
  | "route"
  | "search"
  | "services"
  | "shield"
  | "swap"
  | "umbrella"
  | "user"
  | "wheelchair";

const paths: Record<IconName, ReactNode> = {
  alert: <><path d="M12 3 2.8 20h18.4L12 3Z" /><path d="M12 9v5m0 3h.01" /></>,
  arrow: <path d="m9 18 6-6-6-6" />,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  building: <><path d="M4 21V4h11v17M15 9h5v12M8 8h3m-3 4h3m-3 4h3m7-3h2m-2 4h2M2 21h20" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  cloud: <><path d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 8.8 4.6 4.6 0 0 0 7 18Z" /><path d="M8 21h.01m4-.01h.01M16 21h.01" /></>,
  community: <><circle cx="8" cy="9" r="3" /><circle cx="17" cy="8" r="2.5" /><path d="M2.5 20c.3-4 2.1-6 5.5-6s5.2 2 5.5 6M14 14c4.4-.7 6.8 1.3 7.2 5" /></>,
  contact: <><circle cx="9" cy="8" r="3" /><path d="M3 20c.3-4.3 2.3-6.5 6-6.5s5.7 2.2 6 6.5M16 7h5m-5 4h5m-4 4h4" /></>,
  dumbbell: <><path d="M4 9v6m3-8v10m10-10v10m3-8v6M7 12h10M2 10v4m20-4v4" /></>,
  elevator: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="m8 9 2-2 2 2m-2-2v5m6 3-2 2-2-2m2 2v-5" /></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
  home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
  location: <><path d="M20 10c0 5.5-8 12-8 12S4 15.5 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15m6-12v15" /></>,
  notice: <><path d="M4 5h16v14H4z" /><path d="M8 9h8m-8 4h5" /></>,
  phone: <path d="M6.6 3h3l1.5 4.2-2 1.6a16 16 0 0 0 6.1 6.1l1.6-2 4.2 1.5v3c0 2-1.6 3.6-3.6 3.4A16.5 16.5 0 0 1 3.2 6.6C3 4.6 4.6 3 6.6 3Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  report: <><path d="M5 3h14v18H5z" /><path d="M9 8h6m-6 4h6m-6 4h3" /></>,
  route: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  services: <><path d="M14 6a4 4 0 0 0-5 5L3 17l4 4 6-6a4 4 0 0 0 5-5l-3 3-3-3 2-4Z" /></>,
  shield: <><path d="M12 3 4.5 6v5.5c0 4.7 3.1 7.6 7.5 9.5 4.4-1.9 7.5-4.8 7.5-9.5V6L12 3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
  swap: <path d="M7 7h11l-3-3m2 13H6l3 3" />,
  umbrella: <><path d="M4 12a8 8 0 0 1 16 0H4Z" /><path d="M12 4v14a3 3 0 0 0 6 0" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c.5-5 3.2-7.5 8-7.5s7.5 2.5 8 7.5" /></>,
  wheelchair: <><circle cx="10" cy="4" r="2" /><path d="M9 7v6h6l3 6m-9-8a5 5 0 1 0 5 6M8 9h5" /></>,
};

function Icon({ name, size = "md" }: { name: IconName; size?: "sm" | "md" | "lg" | "xl" }) {
  return <svg className={`icon icon-${size}`} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Button({ children, className = "", onClick, label, disabled }: {
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
  label?: string;
  disabled?: boolean;
}) {
  return <button type="button" className={className} onClick={onClick} aria-label={label} disabled={disabled}>{children}</button>;
}

type Tab = "home" | "community" | "safety" | "routes";
type Sheet = "booking" | "report" | "suspicious" | "sos" | "contacts" | "notice" | "profile" | "services" | "forecast" | "history" | null;

const quickActions: { title: string; subtitle: string; icon: IconName; tone: string; sheet?: Sheet }[] = [
  { title: "Contacts", subtitle: "People & management", icon: "contact", tone: "blue", sheet: "contacts" },
  { title: "Book facility", subtitle: "Gym, sauna & courts", icon: "calendar", tone: "mint", sheet: "booking" },
  { title: "Notices", subtitle: "Sample community updates", icon: "notice", tone: "yellow", sheet: "notice" },
  { title: "Services", subtitle: "Community support", icon: "services", tone: "lavender" },
  { title: "Report issue", subtitle: "Maintenance & safety", icon: "report", tone: "orange", sheet: "report" },
  { title: "Accessible map", subtitle: "Lifts & facilities", icon: "wheelchair", tone: "green" },
];

type Booking = { id: string; facility: string; date: string; time: string };
type Report = { id: string; category: string; details: string; created: string };
type Contact = { id: string; name: string; phone: string };
function useStored<T,>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? initial; } catch { return initial; } });
  const [failed, setFailed] = useState(false);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); setFailed(false); } catch { setFailed(true); } }, [key, value]);
  return [value, setValue, failed] as const;
}
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toast, setToast] = useState("");
  const [facility, setFacility] = useState("Gym");
  const [routeReady, setRouteReady] = useState(false);
  const [from, setFrom] = useState("My location");
  const [to, setTo] = useState("Community health center");

  const [bookings, setBookings, bookingError] = useStored<Booking[]>("cc-bookings", []);
  const [reports, setReports, reportError] = useStored<Report[]>("cc-reports", []);
  const [contacts, setContacts, contactError] = useStored<Contact[]>("cc-contacts", []);
  const [profile, setProfile, profileError] = useStored("cc-profile", { name: "Alex", largeText: false, contrast: false });
  const [noticesRead, setNoticesRead] = useStored("cc-notices-read", false);
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("10:30 AM");
  const [category, setCategory] = useState("Maintenance issue");
  const [details, setDetails] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [search, setSearch] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!sheet) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea, select, a[href]') || []);
    focusable()[0]?.focus();
    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheet(null);
      if (e.key === 'Tab') { const nodes = focusable(); const first = nodes[0], last = nodes[nodes.length-1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [sheet]);
  const saveReport = (kind: string) => {
    if (!details.trim()) { notify("Please describe what happened."); return; }
    setReports(prev => [{ id: crypto.randomUUID(), category: kind, details: details.trim(), created: new Date().toLocaleString() }, ...prev]);
    setDetails(""); setSheet("history"); notify("Saved on this device. Not sent to security.");
  };
  const shareLocation = () => {
    if (!navigator.geolocation) { notify("Location is unavailable in this browser."); return; }
    navigator.geolocation.getCurrentPosition(async ({coords}) => {
      const text = `My location: https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
      try { if (navigator.share) await navigator.share({title:"My location", text}); else { await navigator.clipboard.writeText(text); notify("Location link copied. Paste it to your contact."); } }
      catch { notify("Location was not shared. Please try again."); }
    }, () => notify("Location unavailable. Check location permission."), {timeout: 10000});
  };
  const notify = (message: string) => {
    setToast(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(""), 4500);
  };

  const openAction = (title: string, target?: Sheet) => {
    if (target) setSheet(target);
    else if (title === "Accessible map") setTab("routes");
    else setSheet("services");
  };

  return (
    <div className="stage">
      <div className={`phone-app ${profile.largeText ? "large-text" : ""} ${profile.contrast ? "high-contrast" : ""}`}>
        <div className="phone-status"><span>9:41</span><div><span className="signal">▮▮▮</span><span>5G</span><span className="battery" /></div></div>

        <div className="app-header">
          <div className="brand-lockup"><div className="brand-icon"><Icon name="community" size="sm" /></div><span>CommunityCare</span></div>
          <div className="header-actions">
            <Button className="round-button" label="Notifications" onClick={() => setSheet("notice")}><Icon name="bell" size="sm" /><i /></Button>
            <Button className="avatar-button" label="Profile" onClick={() => setSheet("profile")}>{profile.name.slice(0,2).toUpperCase()}</Button>
          </div>
        </div>

        <main className="screen">
          {(bookingError || reportError || contactError || profileError) && <div role="alert" className="demo-note">Storage unavailable: changes may be lost when you close this page.</div>}
          {tab === "home" && (
            <div className="screen-content">
              <section className="greeting">
                <div className="overline">{new Date().toLocaleDateString("en-MY", {weekday:"long", month:"long", day:"numeric"}).toUpperCase()}</div>
                <div className="screen-title">Hello, {profile.name}</div>
                <div className="muted">Everything you need, right in your community.</div>
              </section>

              <section className="status-banner">
                <div className="status-icon"><Icon name="shield" /></div>
                <div><div className="status-title">CommunityCare demo</div><div className="status-copy">Sample data · No live monitoring</div></div>
                <span className="live-dot" />
              </section>

              <section>
                <div className="section-title-row"><div className="section-title">Community hub</div><Button onClick={() => setTab("community")}>View all</Button></div>
                <div className="action-grid">
                  {quickActions.map((action) => (
                    <Button className="action-card" key={action.title} onClick={() => openAction(action.title, action.sheet)}>
                      <span className={`action-icon ${action.tone}`}><Icon name={action.icon} /></span>
                      <span className="action-title">{action.title}</span>
                      <span className="action-subtitle">{action.subtitle}</span>
                    </Button>
                  ))}
                </div>
              </section>

              <section className="mini-emergency">
                <div className="mini-copy"><div className="mini-label">EMERGENCY CENTER</div><div className="mini-title">Help is one tap away</div><div className="mini-subtitle">Send an SOS or share your location.</div></div>
                <Button className="sos-small" onClick={() => setSheet("sos")}>SOS</Button>
              </section>

              <section className="notice-preview">
                <div className="section-title-row"><div className="section-title">Latest notice</div><Button onClick={() => setSheet("notice")}>See all</Button></div>
                <Button className="notice-row" onClick={() => setSheet("notice")}>
                  <span className="notice-date"><b>22</b><small>MAY</small></span>
                  <span className="notice-copy"><b>Annual fire safety inspection</b><small>Building access may be limited, 9 AM–1 PM.</small></span>
                  <Icon name="arrow" size="sm" />
                </Button>
              </section>
            </div>
          )}

          {tab === "community" && (
            <div className="screen-content">
              <section className="page-heading"><div className="overline">YOUR NEIGHBORHOOD</div><div className="screen-title">Community</div><div className="muted">Manage your home and connect with local services.</div></section>
              <div className="search"><Icon name="search" size="sm" /><input value={search} onChange={e => setSearch(e.target.value)} aria-label="Search community services" placeholder="Search services, people, notices" /></div>
              <section className="community-menu">
                {quickActions.slice(0, 5).filter(item => `${item.title} ${item.subtitle}`.toLowerCase().includes(search.toLowerCase())).map((item) => (
                  <Button className="menu-row" key={item.title} onClick={() => openAction(item.title, item.sheet)}>
                    <span className={`menu-icon ${item.tone}`}><Icon name={item.icon} /></span>
                    <span className="menu-copy"><b>{item.title}</b><small>{item.subtitle}</small></span>
                    {item.title === "Notices" && <span className="count">{noticesRead ? 0 : 3}</span>}
                    <Icon name="arrow" size="sm" />
                  </Button>
                ))}
              </section>
              <Button className="outline-action" onClick={() => setSheet("history")}>My bookings & reports ({bookings.length + reports.length})</Button>
              <section className="facility-preview">
                <div className="section-title-row"><div><div className="section-title">Popular facilities</div><div className="section-note">Available today</div></div><Button onClick={() => setSheet("booking")}>Book now</Button></div>
                <div className="facility-list">
                  <Button onClick={() => setSheet("booking")}><span className="facility-pic gym"><Icon name="dumbbell" /></span><b>Gym</b><small>Open · 6 AM–10 PM</small></Button>
                  <Button onClick={() => setSheet("booking")}><span className="facility-pic sauna">°C</span><b>Sauna</b><small>4 slots available</small></Button>
                  <Button onClick={() => setSheet("booking")}><span className="facility-pic court">01</span><b>Court</b><small>Next slot · 2:30 PM</small></Button>
                </div>
              </section>
            </div>
          )}

          {tab === "safety" && (
            <div className="screen-content safety-screen">
              <section className="page-heading"><div className="overline safety-overline">SAFETY DEMONSTRATION</div><div className="screen-title">Emergency help</div><div className="muted">Demo only. No responders are connected.</div></section>
              <section className="environment-card">
                <div className="environment-top">
                  <div className="weather-now"><span className="weather-icon"><Icon name="cloud" size="lg" /></span><div><b>24°</b><small>Light rain · Feels like 23°</small></div></div>
                  <span className="live-badge"><i /> DEMO</span>
                </div>
                <div className="environment-stats">
                  <div><small>AIR QUALITY</small><b><span className="aqi-dot" />42 <em>Good</em></b></div>
                  <div><small>RAIN</small><b>78%</b></div>
                  <div><small>WIND</small><b>18 <em>km/h</em></b></div>
                </div>
                <div className="environment-advice"><Icon name="umbrella" size="sm" /><span><b>Bring an umbrella.</b> Rain is likely until 4 PM. Outdoor activity is safe.</span></div>
              </section>

              <section className="disaster-card">
                <div className="disaster-heading"><span><Icon name="alert" /></span><div><small>NATURAL HAZARD FORECAST</small><b>Thunderstorm watch</b></div><em>MODERATE</em></div>
                <div className="prediction-row">
                  <div><span>5–8 PM</span><small>Expected window</small></div>
                  <div><span>65%</span><small>Probability</small></div>
                  <div><span>Low</span><small>Flood risk</small></div>
                </div>
                <div className="disaster-advice">Strong winds may develop this evening. Stay indoors if an alert is issued and keep devices charged.</div>
                <Button onClick={() => setSheet("forecast")}>View forecast & preparedness <Icon name="arrow" size="sm" /></Button>
              </section>

              <section className="sos-panel">
                <div className="pulse-ring"><Button className="sos-main" onClick={() => setSheet("sos")}><span>SOS</span><small>PRESS FOR HELP</small></Button></div>
                <div className="sos-instruction">SOS is a demonstration. It does not contact security or emergency services.</div>
              </section>
              <section className="safety-actions">
                <Button onClick={() => { setCategory("Suspicious activity"); setSheet("suspicious"); }}><span className="safety-action-icon"><Icon name="eye" /></span><span><b>Alert residents about suspicious activity</b><small>Report gate, mailbox, or access attempts</small></span><Icon name="arrow" size="sm" /></Button>
                <Button onClick={() => shareLocation()}><span className="safety-action-icon location-tone"><Icon name="location" /></span><span><b>Share emergency location</b><small>Share a one-time location link with a contact</small></span><Icon name="arrow" size="sm" /></Button>
                <Button onClick={() => setSheet("contacts")}><span className="safety-action-icon contact-tone"><Icon name="phone" /></span><span><b>Emergency contacts</b><small>Manage who gets notified</small></span><Icon name="arrow" size="sm" /></Button>
              </section>
              <div className="security-card"><span><Icon name="shield" /></span><div><b>Community security</b><small>Add your verified security contact</small></div><Button onClick={() => setSheet("contacts")}>Call</Button></div>
            </div>
          )}

          {tab === "routes" && (
            <div className="route-screen">
              <div className="demo-note">Illustrative map · Route is not calculated from your entries</div><div className="route-header">
                <div><div className="overline">ACCESSIBLE NAVIGATION</div><div className="screen-title">Find your route</div></div>
                <Button className="round-button" label="Accessible facilities" onClick={() => notify("Demo facilities: Lift A and accessible WC. Availability is not verified.")}><Icon name="wheelchair" size="sm" /></Button>
              </div>
              <div className="route-fields">
                <div className="route-markers"><i /><span /><i /></div>
                <div>
                  <label>START</label><input aria-label="Starting point" value={from} onChange={(e) => setFrom(e.target.value)} />
                  <label>DESTINATION</label><input aria-label="Destination" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
                <Button label="Swap locations" onClick={() => { setFrom(to); setTo(from); }}><Icon name="swap" size="sm" /></Button>
              </div>
              <div className="preference-scroll">
                <Button className="selected" onClick={() => notify("Demo route is shown as step-free; accessibility is not verified.")}><Icon name="wheelchair" size="sm" />Step-free</Button>
                <Button onClick={() => notify("Lift status is sample data, not verified.")}><Icon name="elevator" size="sm" />Working lifts</Button>
                <Button onClick={() => notify("Slope data is illustrative only.")}><Icon name="route" size="sm" />Gentle slope</Button>
              </div>
              <div className="mobile-map">
                <span className="map-green green-one" /><span className="map-green green-two" />
                <span className="road road-one" /><span className="road road-two" /><span className="road road-three" />
                <svg viewBox="0 0 400 420" preserveAspectRatio="none"><path className="route-halo" d="M70 350C92 300 55 250 130 220s110 30 145-35 45-55 80-115" /><path className="route-line-path" d="M70 350C92 300 55 250 130 220s110 30 145-35 45-55 80-115" /></svg>
                <span className="start-dot" /><span className="destination-pin"><Icon name="location" size="sm" /></span>
                <span className="map-place place-one"><Icon name="elevator" size="sm" />Lift A</span>
                <span className="map-place place-two"><Icon name="wheelchair" size="sm" />Accessible WC</span>
                <span className="map-label park-label">RIVERSIDE PARK</span>
                <Button className="locate-button" label="Center my location" onClick={() => notify("Illustrative map: real positioning is not connected.")}><Icon name="location" /></Button>
              </div>
              <section className={`route-card ${routeReady ? "ready" : ""}`}>
                <div className="route-card-top"><span className="route-duration"><b>14</b> min</span><span className="route-distance">0.6 miles · Mostly flat</span><span className="route-score"><Icon name="check" size="sm" />Best match</span></div>
                <div className="route-features"><span><Icon name="elevator" size="sm" />2 lifts</span><span><Icon name="wheelchair" size="sm" />Step-free</span><span><Icon name="building" size="sm" />3 facilities</span></div>
                <Button className="primary-action" onClick={() => { setRouteReady(true); notify("Demo route shown. This is not real navigation."); }}><Icon name="route" />{routeReady ? "Demo route displayed" : "Preview demo route"}</Button>
              </section>
            </div>
          )}
        </main>

        <nav className="bottom-nav" aria-label="App navigation">
          {([
            ["home", "home", "Home"],
            ["community", "community", "Community"],
            ["safety", "shield", "Safety"],
            ["routes", "map", "Routes"],
          ] as [Tab, IconName, string][]).map(([value, icon, label]) => (
            <Button key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>
              <span><Icon name={icon} /></span><small>{label}</small>
            </Button>
          ))}
        </nav>

        {sheet && (
          <div className="sheet-layer" role="dialog" aria-modal="true" aria-label={`${sheet} panel`}>
            <Button className="sheet-backdrop" label="Close" onClick={() => setSheet(null)} />
            <section className="bottom-sheet" ref={dialog}>
              <Button className="close-sheet" label="Close panel" onClick={() => setSheet(null)}>Close ×</Button>
              <div className="sheet-handle" />
              {sheet === "booking" && (
                <>
                  <div className="sheet-title">Book a facility</div><div className="sheet-subtitle">Choose a space and reserve your time.</div>
                  <div className="facility-tabs">{["Gym", "Sauna", "Court"].map((item) => <Button className={facility === item ? "selected" : ""} key={item} onClick={() => setFacility(item)}>{item}</Button>)}</div>
                  <label className="form-field">Booking date<input type="date" min={today()} value={date} onChange={e => setDate(e.target.value)} /></label>
                  <div className="time-label">AVAILABLE DEMO TIMES</div><div className="time-grid">{["9:00 AM", "10:30 AM", "2:00 PM", "4:30 PM"].map(slot => <Button className={time === slot ? "selected" : ""} key={slot} onClick={() => setTime(slot)}>{slot}</Button>)}</div>
                  <p className="demo-note">Saved on this device only. Facility availability is not connected.</p>
                  <Button className="primary-action" onClick={() => {
                    if (!date || date < today()) { notify("Choose today or a future date."); return; }
                    if (bookings.some(b => b.facility === facility && b.date === date && b.time === time)) { notify("You already booked that slot."); return; }
                    setBookings(prev => [...prev, {id: crypto.randomUUID(), facility, date, time}]); setSheet("history"); notify("Demo booking saved on this device.");
                  }}>Save demo booking</Button>
                </>
              )}
              {sheet === "sos" && (
                <><div className="sheet-alert-icon"><Icon name="alert" size="lg" /></div><div className="sheet-title centered">Send emergency SOS?</div><div className="sheet-subtitle centered">Demo only: no location or alert will be sent. Use your phone to call for real assistance.</div><Button className="danger-action" onClick={() => { setSheet(null); notify("SOS demo complete. No alert was sent."); }}>Test SOS demo</Button><Button className="cancel-action" onClick={() => setSheet(null)}>Cancel</Button></>
              )}
              {(sheet === "report" || sheet === "suspicious") && <>
                <div className="sheet-title">{sheet === "suspicious" ? "Report suspicious activity" : "Report a problem"}</div>
                <p className="sheet-subtitle">Save a report on this device. It will not be sent to security.</p>
                <label className="form-field">Category<select value={category} onChange={e => setCategory(e.target.value)}>{["Maintenance issue", "Suspicious activity", "Mailbox password attempts", "Door or gate tampering", "Accessibility barrier", "Noise or disturbance"].map(item => <option key={item}>{item}</option>)}</select></label>
                <label className="form-field">Details<textarea value={details} maxLength={2000} onChange={e => setDetails(e.target.value)} placeholder="What happened and where?" rows={4} /></label>
                <Button className="primary-action" disabled={!details.trim()} onClick={() => saveReport(category)}>Save report locally</Button>
              </>}
              {sheet === "contacts" && <>
                <div className="sheet-title">Important contacts</div><p className="sheet-subtitle">Add verified phone numbers for security, family, or management.</p>
                <div className="record-list">{contacts.length === 0 && <p>No contacts added yet.</p>}{contacts.map(c => <div key={c.id}><b>{c.name}</b><a href={`tel:${c.phone}`}>{c.phone} · Call</a><Button onClick={() => setContacts(prev => prev.filter(x => x.id !== c.id))}>Remove</Button></div>)}</div>
                <label className="form-field">Name<input value={contactName} onChange={e => setContactName(e.target.value)} maxLength={80} /></label>
                <label className="form-field">Phone number<input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+60…" /></label>
                <Button className="primary-action" onClick={() => { const phone = contactPhone.replace(/[ ()-]/g, ""); if (!contactName.trim() || !/^\+?[0-9]{6,15}$/.test(phone)) { notify("Enter a name and valid phone number."); return; } setContacts(prev => [...prev, {id:crypto.randomUUID(), name:contactName.trim(), phone}]); setContactName(""); setContactPhone(""); notify("Contact saved."); }}>Add contact</Button>
              </>}
              {sheet === "profile" && <>
                <div className="sheet-title">Profile & accessibility</div>
                <label className="form-field">Your name<input value={profile.name} maxLength={40} onChange={e => setProfile({...profile, name:e.target.value})} /></label>
                <label className="setting-row"><input type="checkbox" checked={profile.largeText} onChange={e => setProfile({...profile, largeText:e.target.checked})} />Larger text</label>
                <label className="setting-row"><input type="checkbox" checked={profile.contrast} onChange={e => setProfile({...profile, contrast:e.target.checked})} />Higher contrast</label>
                <p className="demo-note">Settings save on this browser. This is a local profile, not an online account.</p>
                <Button className="primary-action" onClick={() => setSheet("history")}>My bookings & reports</Button>
              </>}
              {sheet === "history" && <>
                <div className="sheet-title">My bookings & reports</div><p className="sheet-subtitle">Local demo records. Not submitted to management.</p>
                <div className="record-list"><h3>Bookings</h3>{!bookings.length && <p>No bookings yet.</p>}{bookings.map(b => <div key={b.id}><b>{b.facility}</b><span>{b.date} · {b.time}</span><Button onClick={() => setBookings(prev => prev.filter(x => x.id !== b.id))}>Cancel booking</Button></div>)}
                <h3>Reports</h3>{!reports.length && <p>No reports yet.</p>}{reports.map(r => <div key={r.id}><b>{r.category}</b><span>{r.created} · Local draft</span><p>{r.details}</p><Button onClick={() => setReports(prev => prev.filter(x => x.id !== r.id))}>Delete draft</Button></div>)}</div>
              </>}
              {sheet === "services" && <><div className="sheet-title">Community support</div><p className="sheet-subtitle">Contact your community team to arrange help.</p><div className="report-options">{["Shopping assistance", "Transport assistance", "Home maintenance", "Accessibility support"].map(name => <Button key={name} onClick={() => { setCategory("Accessibility barrier"); setDetails(`Request: ${name}. `); setSheet("report"); }}>{name}<Icon name="arrow" size="sm" /></Button>)}</div></>}
              {sheet === "forecast" && <><div className="sheet-title">Sample forecast</div><p className="sheet-subtitle">All weather figures on this screen are illustrative. No weather or disaster service is connected.</p><p>For current conditions, check your local official weather service. Do not use this demo to make safety decisions.</p><Button className="primary-action" onClick={() => setSheet(null)}>Understood</Button></>}
              {sheet === "notice" && (
                <><div className="sheet-title">Management notices</div><div className="sheet-subtitle">Updates from your community management team.</div><div className="notice-list"><div><span className={noticesRead ? "" : "unread"} /><span><b>Annual fire safety inspection</b><small>May 22 · Building access may be limited.</small></span></div><div><span className={noticesRead ? "" : "unread"} /><span><b>Pool maintenance complete</b><small>May 19 · The pool has reopened.</small></span></div><div><span /><span><b>Community meeting minutes</b><small>May 16 · Read the monthly summary.</small></span></div></div><Button className="primary-action" onClick={() => { setNoticesRead(true); setSheet(null); notify("All notices marked as read"); }}>Mark all as read</Button></>
              )}
            </section>
          </div>
        )}
        {toast && <div className="toast" role="status"><Icon name="check" size="sm" />{toast}</div>}
      </div>
    </div>
  );
}

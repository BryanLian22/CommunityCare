import VoiceNavigation from './VoiceNavigation';
import type { VoiceCommand } from './voiceCommands';
import PhonePopupBoundary from './PhonePopupBoundary';
import DateTimeField from './DateTimeField';
import ResidenceLocations from './ResidenceLocations';
import CloseButton from './CloseButton';
import MarketAds from './MarketAds';
import HouseholdHome from './Household';
import Routes from './Routes';
import Weather from './Weather';
import ResidentEmergency from './Emergency';
import RequestUpdate from './RequestUpdate';
import BookFacility, { BookingHistory, bookingStarted } from './Bookings';
import Notifications from './Notifications';
import { ResidentAssistance } from './Assistance';
import { useState, useEffect, useRef, type ReactNode } from "react";
import { api, type ResidentData, type User } from "./api";
import ContactDirectory from "./ContactDirectory";
import { useSession } from "./Session";

type IconName =
  | "alert"
  | "arrow"
  | "bell"
  | "building"
  | "bus"
  | "calendar"
  | "car"
  | "check"
  | "chevron"
  | "cloud"
  | "community"
  | "contact"
  | "dumbbell"
  | "door"
  | "elevator"
  | "eye"
  | "home"
  | "bridge"
  | "location"
  | "lock"
  | "map"
  | "market"
  | "notice"
  | "phone"
  | "plus"
  | "report"
  | "route"
  | "search"
  | "services"
  | "shield"
  | "snowflake"
  | "swap"
  | "umbrella"
  | "user"
  | "walk"
  | "wheelchair";

const paths: Record<IconName, ReactNode> = {
  alert: <><path d="M12 3 2.8 20h18.4L12 3Z" /><path d="M12 9v5m0 3h.01" /></>,
  arrow: <path d="m9 18 6-6-6-6" />,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  building: <><path d="M4 21V4h11v17M15 9h5v12M8 8h3m-3 4h3m-3 4h3m7-3h2m-2 4h2M2 21h20" /></>,
  bus: <>
    <rect x="4" y="3" width="16" height="16" rx="3" />
    <path d="M7 19v2m10-2v2M4 11h16M8 15h.01M16 15h.01M8 7h8" />
  </>,
  calendar: <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 10h18" />
  </>,
  car: <>
    <path d="m5 11 2-5h10l2 5M3 12h18v6H3z" />
    <path d="M6 18v2m12-2v2M7 15h.01M17 15h.01" />
  </>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m6 9 6 6 6-6" />,
  cloud: <>
    <path d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 8.8 4.6 4.6 0 0 0 7 18Z" />
    <path d="M8 21h.01m4-.01h.01M16 21h.01" />
  </>,
  community: <>
    <circle cx="8" cy="9" r="3" />
    <circle cx="17" cy="8" r="2.5" />
    <path d="M2.5 20c.3-4 2.1-6 5.5-6s5.2 2 5.5 6M14 14c4.4-.7 6.8 1.3 7.2 5" />
  </>,
  contact: <>
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20c.3-4.3 2.3-6.5 6-6.5s5.7 2.2 6 6.5M16 7h5m-5 4h5m-4 4h4" />
  </>,
  dumbbell: <><path d="M4 9v6m3-8v10m10-10v10m3-8v6M7 12h10M2 10v4m20-4v4" /></>,
  door: <><path d="M5 21V3h13v18M5 21h15M14 12h.01" /><path d="M8 6h7v15H8z" /></>,
  elevator: <>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="m8 9 2-2 2 2m-2-2v5m6 3-2 2-2-2m2 2v-5" />
  </>,
  eye: <>
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
    <circle cx="12" cy="12" r="2.5" />
  </>,
  home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
  bridge: <><path d="M3 19h18M5 19V9m14 10V9M5 12c3 0 4-5 7-5s4 5 7 5M8 19v-5m8 5v-5" /></>,
  location: <>
    <path d="M20 10c0 5.5-8 12-8 12S4 15.5 4 10a8 8 0 1 1 16 0Z" />
    <circle cx="12" cy="10" r="2.5" />
  </>,
  lock: <>
    <rect x="5" y="10" width="14" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
  </>,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15m6-12v15" /></>,
  market: <>
    <path d="M4 10v11h16V10M3 4h18l-1 6a3 3 0 0 1-5 1 3.5 3.5 0 0 1-6 0 3 3 0 0 1-5-1L3 4Z" />
    <path d="M9 21v-6h6v6" />
  </>,
  notice: <><path d="M4 5h16v14H4z" /><path d="M8 9h8m-8 4h5" /></>,
  phone: <path d="M6.6 3h3l1.5 4.2-2 1.6a16 16 0 0 0 6.1 6.1l1.6-2 4.2 1.5v3c0 2-1.6 3.6-3.6 3.4A16.5 16.5 0 0 1 3.2 6.6C3 4.6 4.6 3 6.6 3Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  report: <><path d="M5 3h14v18H5z" /><path d="M9 8h6m-6 4h6m-6 4h3" /></>,
  route: <>
    <circle cx="6" cy="18" r="2" />
    <circle cx="18" cy="6" r="2" />
    <path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3" />
  </>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  services: <><path d="M14 6a4 4 0 0 0-5 5L3 17l4 4 6-6a4 4 0 0 0 5-5l-3 3-3-3 2-4Z" /></>,
  shield: <>
    <path d="M12 3 4.5 6v5.5c0 4.7 3.1 7.6 7.5 9.5 4.4-1.9 7.5-4.8 7.5-9.5V6L12 3Z" />
    <path d="m8.5 12 2.2 2.2 4.8-5" />
  </>,
  snowflake: <>
    <path d="M12 2v20M4 7l16 10M4 17 20 7" />
    <path d="m9 4 3 3 3-3M9 20l3-3 3 3M5 10l4 1-1-4m11 7-4-1 1 4M5 14l4-1-1 4m11-7-4 1 1-4" />
  </>,
  swap: <path d="M7 7h11l-3-3m2 13H6l3 3" />,
  umbrella: <><path d="M4 12a8 8 0 0 1 16 0H4Z" /><path d="M12 4v14a3 3 0 0 0 6 0" /></>,
  user: <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c.5-5 3.2-7.5 8-7.5s7.5 2.5 8 7.5" />
  </>,
  walk: <>
    <circle cx="13" cy="4" r="2" />
    <path d="m10 9 3-2 2 3 3 1m-8-2-2 5-3 2m8-4-2 4-1 5m3-5 4 4" />
  </>,
  wheelchair: <>
    <circle cx="10" cy="4" r="2" />
    <path d="M9 7v6h6l3 6m-9-8a5 5 0 1 0 5 6M8 9h5" />
  </>,
};

function Icon({ name, size = "md" }: { name: IconName; size?: "sm" | "md" | "lg" | "xl" }) {
  return <svg className={`icon icon-${size}`} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {paths[name]}
  </svg>;
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

type Tab = "market" | "home" | "community" | "safety" | "routes";
type Sheet = "service" | "offer" | "booking" | "report" | "suspicious" | "sos" | "contacts" | "notice" | "profile" | "services" | "history" | "notifications" | "request-update" | null;

const quickActions: { title: string; subtitle: string; icon: IconName; tone: string; sheet?: Sheet }[] = [
  { title: "Contacts", subtitle: "People & management", icon: "contact", tone: "blue", sheet: "contacts" },
  { title: "Book facility", subtitle: "Gym, sauna & courts", icon: "calendar", tone: "mint", sheet: "booking" },
  { title: "Notices", subtitle: "Community updates", icon: "notice", tone: "yellow", sheet: "notice" },
  {

    title: "Request Assistance",
    subtitle: "Help & request tracking",
    icon: "services",
    tone: "lavender",
    sheet: "services"
  },
  { title: "Report issue", subtitle: "Maintenance & safety", icon: "report", tone: "orange", sheet: "report" },
  { title: "Accessible map", subtitle: "Lifts & facilities", icon: "wheelchair", tone: "green" },
];

const today = () => {

  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [billVoiceRequest, setBillVoiceRequest] = useState(0);
  const [voiceLocation, setVoiceLocation] = useState<{ target: string; id: number } | null>(null);
  useEffect(() => {
    if (!voiceLocation) return;
    const frame = requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(voiceLocation.target === "routes" ? ".res-map-section" : ".screen");
      if (element) { element.tabIndex = -1; element.focus({ preventScroll: true }); if (voiceLocation.target === "routes") element.scrollIntoView({ block: "start" }); else element.scrollTop = 0; }
    });
    return () => cancelAnimationFrame(frame);
  }, [voiceLocation]);
  const [requestTarget, setRequestTarget] = useState<string | undefined>();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toast, setToast] = useState("");
  const [facility, setFacility] = useState("Gym");
  const [service, setService] = useState("Air conditioner");

  const { user, updateUser, logout } = useSession();
  const [data, setData] = useState<ResidentData>({
    bookings: [],
    reports: [],
    contacts: [],
    services: [],
    notices: [],
    communityContacts: [],
    facilities: [],
    assistance: [],
    notifications: [],
    noticesReadAt: ""
  });
  const { bookings, reports, contacts, services: serviceRequests, notices } = data;
  const [profile, setProfile] = useState({ name: user.name, phone: user.phone ?? '', largeText: user.largeText, contrast: user.contrast });
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [dataError, setDataError] = useState("");
  const [currentPassword, setCurrentPassword] = useState(""), [newPassword, setNewPassword] = useState("");
  const unreadCount = notices.filter(n => n.updated > data.noticesReadAt).length;
  const requestLock = useRef(false);
  async function refresh() {
    setData(await api<ResidentData>("/data"));
    setDataError("")
  }
  useEffect(() => {
    let mounted = true;
    const read = () => api<ResidentData>("/data").then(d => {
      if (mounted) {
        setData(d);
        setDataError("")
      }
    }).catch(e => {
      if (mounted) setDataError(e.message)
    }).finally(() => {
      if (mounted) setLoading(false)
    });
    void read();
    const onFocus = () => {
      void read()
    };
    window.addEventListener('focus', onFocus);
    const interval = window.setInterval(() => {
      if (!document.hidden) void read()
    }, 30000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus)
    }
  }, []);
  async function perform(path: string, method: string, payload: unknown, message: string, after?: () => void) {
    if (requestLock.current) return;
    requestLock.current = true;
    setBusy(true);
    setDataError("");
    try {
      await api(path, method, payload);
      after?.();
      notify(message);
      try {
        await refresh()
      } catch {
        setDataError("Saved, but the list could not refresh. Please refresh before submitting again.")
      }
    }
    catch (e) {
      setDataError((e as Error).message);
      notify((e as Error).message)
    } finally {
      requestLock.current = false;
      setBusy(false)
    }
  }
  const removeRecord = (kind: string, id: string) => void perform(`/records/${kind}/${id}`, "DELETE", {}, kind === 'contacts' ? "Contact removed." : "Request cancelled.");
  async function saveProfile() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await api<{ user: User }>("/profile", "PATCH", profile);
      updateUser(result.user);
      notify("Profile saved.")
    } catch (e) {
      notify((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("10:30 AM");
  const [category, setCategory] = useState("Maintenance issue");
  const [details, setDetails] = useState("");
  const [search, setSearch] = useState("");
  const [offer, setOffer] = useState("Home cleaning");
  const [serviceAddress, setServiceAddress] = useState("");
  const [servicePhone, setServicePhone] = useState("");
  const [serviceDetails, setServiceDetails] = useState("");

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
      if (e.key === 'Tab') {

        const nodes = focusable();
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {

          e.preventDefault();
          last?.focus();
        }
        else if (!e.shiftKey && document.activeElement === last) {

          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {

      document.removeEventListener('keydown', keydown);
      previous?.focus();
    };
  }, [sheet]);
  const saveReport = (kind: string) => {
    if (!details.trim()) {

      notify("Please describe what happened.");
      return;
    }
    void perform("/records/reports", "POST", { category: kind, details }, "Report submitted to management.", () => {
      setDetails("");
      setSheet("history")
    });
  };
  const shareLocation = () => {
    if (!navigator.geolocation) {

      notify("Location is unavailable in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const text = `My location: https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
      try {

        if (navigator.share) await navigator.share({ title: "My location", text }); else {

          await navigator.clipboard.writeText(text);
          notify("Location link copied. Paste it to your contact.");
        }
      }
      catch {

        notify("Location was not shared. Please try again.");
      }
    }, () => notify("Location unavailable. Check location permission."), { timeout: 10000 });
  };
  const notify = (message: string) => {
    setToast(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(""), 4500);
  };

  const openAction = (title: string, target?: Sheet) => {
    if (target) {
      setRequestTarget(undefined);
      setSheet(target);
    }
    else if (title === "Accessible map") setTab("routes");
    else setTab("market");
  };

  function navigateByVoice(command: VoiceCommand, transcript: string) {
    setRequestTarget(undefined);
    setSheet(null);
    if (command.target === 'bills') {
      setTab('home'); setBillVoiceRequest(value => value + 1);
    } else if (['home', 'community', 'market', 'safety', 'routes'].includes(command.target)) {
      setTab(command.target as Tab);
      setVoiceLocation({ target: command.target, id: Date.now() });
    } else {
      if (command.target === 'booking') setFacility(command.facility || 'Gym');
      setSheet(command.target as Sheet);
    }
    notify(`Heard “${transcript}” · Opening ${command.label}`);
  }

  return (
    <div className="stage">
      <div className={`phone-app ${profile.largeText ? "large-text" : ""} ${profile.contrast ? "high-contrast" : ""}`}>
        <PhonePopupBoundary />
        <div className="phone-status">
          <span>9:41</span>
          <div>
            <span className="signal">▮▮▮</span>
            <span>5G</span>
            <span className="battery" />
          </div>
        </div>

        <div className="app-header">
          <div className="brand-lockup">
            <div className="brand-icon"><Icon name="community" size="sm" /></div>
            <span>CommunityCare</span>
          </div>
          <div className="header-actions">
            <VoiceNavigation onNavigate={navigateByVoice} />
            <Button className="round-button" label={`Notifications${data.notifications.some(n => !n.readAt) ? `, ${data.notifications.filter(n => !n.readAt).length} unread` : ""}`} onClick={() => setSheet("notifications")}>
              <Icon name="bell" size="sm" />
              {data.notifications.some(n => !n.readAt) && <span className="notification-badge">{data.notifications.filter(n => !n.readAt).length}</span>}
            </Button>
            <Button className="avatar-button" label="Profile" onClick={() => setSheet("profile")}>{profile.name.slice(0, 2).toUpperCase()}</Button>
          </div>
        </div>

        <main className="screen">
          {loading && <div className="data-banner" role="status">Loading your account…</div>}
          {dataError && <div role="alert" className="demo-note">
            {dataError}
            <Button onClick={() => void refresh().catch(e => setDataError(e.message))}>Refresh</Button>
          </div>}
          {tab === "home" && (
            <div className="screen-content">
              <section className="greeting">
                <div className="overline">{new Date().toLocaleDateString("en-MY", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}</div>
                <div className="screen-title">Hello, {profile.name}</div>
                <ResidenceLocations />
                <div className="muted">Everything you need, right in your community.</div>
              </section>

              <section className="status-banner">
                <div className="status-icon"><Icon name="shield" /></div>
                <div>
                  <div className="status-title">Connected to your community</div>
                  <div className="status-copy">Bills, visitor passes & community updates</div>
                </div>
                <span className="live-dot" />
              </section>

              <HouseholdHome voiceRequest={billVoiceRequest} />

              <section>
                <div className="section-title-row">
                  <div className="section-title">Community hub</div>
                  <Button onClick={() => setTab("community")}>View all</Button>
                </div>
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
                <div className="mini-copy">
                  <div className="mini-label">EMERGENCY CENTER</div>
                  <div className="mini-title">Contact your community team</div>
                  <div className="mini-subtitle">Send an SOS or share your location.</div>
                </div>
                <Button className="sos-small" onClick={() => {
                  setRequestTarget(undefined);
                  setSheet("sos")
                }}>SOS</Button>
              </section>


              <section className="notice-preview">
                <div className="section-title-row">
                  <div className="section-title">Latest notice</div>
                  <Button onClick={() => setSheet("notice")}>See all</Button>
                </div>
                <Button className="notice-row" onClick={() => setSheet("notice")}>
                  <span className="notice-date">
                    <b>{notices[0] ? new Date(notices[0].updated).getDate() : "—"}</b>
                    <small>{notices[0] ? new Date(notices[0].updated).toLocaleDateString("en", { month: "short" }) : ""}</small>
                  </span>
                  <span className="notice-copy">
                    <b>{notices[0]?.title || "No notices yet"}</b>
                    <small>{notices[0]?.body.slice(0, 80) || "Community updates will appear here."}</small>
                  </span>
                  <Icon name="arrow" size="sm" />
                </Button>
              </section>
            </div>
          )}

          {tab === "community" && (
            <div className="screen-content">
              <section className="page-heading">
                <div className="overline">YOUR NEIGHBORHOOD</div>
                <div className="screen-title">Community</div>
                <div className="muted">Manage your home and connect with local services.</div>
              </section>
              <div className="search">
                <Icon name="search" size="sm" />
                <input value={search} onChange={e => setSearch(e.target.value)} aria-label="Search community services" placeholder="Search services, people, notices" />
              </div>
              <section className="community-menu">
                {quickActions.slice(0, 5).filter(item => `${item.title} ${item.subtitle}`.toLowerCase().includes(search.toLowerCase())).map((item) => (
                  <Button className="menu-row" key={item.title} onClick={() => openAction(item.title, item.sheet)}>
                    <span className={`menu-icon ${item.tone}`}><Icon name={item.icon} /></span>
                    <span className="menu-copy"><b>{item.title}</b><small>{item.subtitle}</small></span>
                    {item.title === "Notices" && <span className="count">{unreadCount}</span>}
                    <Icon name="arrow" size="sm" />
                  </Button>
                ))}
              </section>
              <Button className="outline-action" onClick={() => setSheet("history")}>My bookings & reports ({bookings.length + reports.length + serviceRequests.length})</Button>
              <section className="facility-preview">
                <div className="section-title-row">
                  <div>
                    <div className="section-title">Popular facilities</div>
                    <div className="section-note">Check live availability</div>
                  </div>
                  <Button onClick={() => setSheet("booking")}>Book now</Button>
                </div>
                <div className="facility-list">
                  <Button onClick={() => {
                    setFacility("Gym");
                    setSheet("booking")
                  }}>
                    <span className="facility-pic gym"><Icon name="dumbbell" /></span>
                    <b>Gym</b>
                    <small>Check available slots</small>
                  </Button>
                  <Button onClick={() => {
                    setFacility("Sauna");
                    setSheet("booking")
                  }}>
                    <span className="facility-pic sauna">°C</span>
                    <b>Sauna</b>
                    <small>Check available slots</small>
                  </Button>
                  <Button onClick={() => {
                    setFacility("Court");
                    setSheet("booking")
                  }}>
                    <span className="facility-pic court">01</span>
                    <b>Court</b>
                    <small>Check available slots</small>
                  </Button>
                </div>
              </section>
            </div>
          )}

          {tab === "market" && (
            <div className="screen-content market-screen">
              <section className="page-heading">
                <div className="overline">COMMUNITY MARKETPLACE</div>
                <div className="screen-title">Market</div>
                <div className="muted">Home services, coordinated by your community team.</div>
              </section>
              <MarketAds onRequest={name => { setService(name); setSheet("service"); }} />
              <Button className="outline-action" onClick={() => setSheet("history")}>My service requests ({serviceRequests.length})</Button>
              <section>
                <div className="section-title-row">
                  <div>
                    <div className="section-title">Book a home service</div>
                    <div className="section-note">Send a request · Management will confirm availability</div>
                  </div>
                  <Button onClick={() => setSheet("service")}>View all</Button>
                </div>
                <div className="service-grid">
                  <Button onClick={() => {

                    setService("Air conditioner");
                    setSheet("service");
                  }}>
                    <span className="service-icon aircon"><Icon name="snowflake" size="lg" /></span>
                    <b>Aircon repair</b>
                    <small>Request a quote</small>
                    <em>Request</em>
                  </Button>
                  <Button onClick={() => {

                    setService("Door repair");
                    setSheet("service");
                  }}>
                    <span className="service-icon doors"><Icon name="door" size="lg" /></span>
                    <b>Door repair</b>
                    <small>Request a quote</small>
                    <em>Request</em>
                  </Button>
                  <Button onClick={() => {

                    setService("Locksmith");
                    setSheet("service");
                  }}>
                    <span className="service-icon locks"><Icon name="lock" size="lg" /></span>
                    <b>Locksmith</b>
                    <small>Request a quote</small>
                    <em>Request</em>
                  </Button>
                  <Button onClick={() => {

                    setService("General repair");
                    setSheet("service");
                  }}>
                    <span className="service-icon general"><Icon name="services" size="lg" /></span>
                    <b>General repair</b>
                    <small>Request a quote</small>
                    <em>Request</em>
                  </Button>
                </div>
              </section>
              <section className="market-provider">
                <span><Icon name="shield" /></span>
                <div>
                  <b>Community provider directory</b>
                  <small>Demo directory · Verification not connected</small>
                </div>
                <Icon name="arrow" size="sm" />
              </section>
              <section>
                <div className="section-title-row">
                  <div className="section-title">Popular near you</div>
                  <Button onClick={() => {

                    setOffer("All offers");
                    setSheet("offer");
                  }}>See all</Button>
                </div>
                <Button className="popular-offer" onClick={() => {

                  setOffer("FreshFold Laundry");
                  setSheet("offer");
                }}>
                  <span className="popular-mark">F</span>
                  <span><b>FreshFold Laundry</b><small>Pickup & delivery · 4.8 rating</small></span>
                  <em>$8 off</em>
                </Button>
              </section>
            </div>
          )}

          {tab === "safety" && (
            <div className="screen-content safety-screen">
              <section className="page-heading">
                <div className="overline safety-overline">COMMUNITY SAFETY</div>
                <div className="screen-title">Emergency help</div>
                <div className="muted">Send an alert, track updates, or call your community team.</div>
              </section>
              <Weather />

              <section className="sos-panel">
                <div className="pulse-ring">
                  <Button className="sos-main" onClick={() => {
                    setRequestTarget(undefined);
                    setSheet("sos")
                  }}>
                    <span>SOS</span>
                    <small>PRESS FOR HELP</small>
                  </Button>
                </div>
                <div className="sos-instruction">Send an in-app alert to management, or call your guard directly. Emergency services are not dispatched by this app.</div>
              </section>
              <section className="safety-actions">
                <Button onClick={() => {

                  setCategory("Suspicious activity");
                  setSheet("suspicious");
                }}>
                  <span className="safety-action-icon"><Icon name="eye" /></span>
                  <span>
                    <b>Alert residents about suspicious activity</b>
                    <small>Report gate, mailbox, or access attempts</small>
                  </span>
                  <Icon name="arrow" size="sm" />
                </Button>
                <Button onClick={() => shareLocation()}>
                  <span className="safety-action-icon location-tone"><Icon name="location" /></span>
                  <span>
                    <b>Share emergency location</b>
                    <small>Share a one-time location link with a contact</small>
                  </span>
                  <Icon name="arrow" size="sm" />
                </Button>
                <Button onClick={() => setSheet("contacts")}>
                  <span className="safety-action-icon contact-tone"><Icon name="phone" /></span>
                  <span>
                    <b>Emergency contacts</b>
                    <small>Call guard, management or personal contacts</small>
                  </span>
                  <Icon name="arrow" size="sm" />
                </Button>
              </section>
              <div className="security-card">
                <span><Icon name="shield" /></span>
                <div><b>Community security</b><small>View your saved guard number</small></div>
                <Button onClick={() => setSheet("contacts")}>Call</Button>
              </div>
            </div>
          )}

          {tab === "routes" && <Routes />}
        </main>

        <nav className="bottom-nav" aria-label="App navigation">
          {([
            ["community", "community", "Community"],
            ["market", "market", "Market"],
            ["home", "home", "Home"],
            ["safety", "shield", "Safety"],
            ["routes", "map", "Routes"],
          ] as [Tab, IconName, string][]).map(([value, icon, label]) => (
            <Button key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>
              <span><Icon name={icon} /></span>
              <small>{label}</small>
            </Button>
          ))}
        </nav>

        {sheet && (
          <div className="sheet-layer" role="dialog" aria-modal="true" aria-label={`${sheet} panel`}>
            <Button className="sheet-backdrop" label="Close" onClick={() => setSheet(null)} />
            <section className={`bottom-sheet ${sheet === "contacts" ? "contacts-sheet" : ""} ${sheet === "profile" ? "profile-sheet" : ""}`} ref={dialog}>
              <div className="cc-sheet-tools"><CloseButton label="Close panel" onClick={() => setSheet(null)} /></div>
              <div className="sheet-handle" />
              {dataError && <div className="account-alert" role="alert">{dataError}</div>}
              {busy && <p role="status">Saving…</p>}
              {sheet === "booking" && <BookFacility initialFacility={facility} facilities={data.facilities} onRefresh={refresh} onDone={() => setSheet("history")} />}
              {sheet === "service" && (
                <>
                  <div className="sheet-title">Book a home service</div>
                  <div className="sheet-subtitle">Submit a request to management. Provider dispatch is not automatic.</div>
                  <div className="service-choice">
                    {[
                      ["Air conditioner", "snowflake"],
                      ["Door repair", "door"],
                      ["Locksmith", "lock"],
                      ["General repair", "services"],
                    ].map(([name, icon]) => <Button className={service === name ? "selected" : ""} key={name} onClick={() => setService(name)}>
                      <Icon name={icon as IconName} />
                      <span>
                        <b>{name}</b>
                        <small>Request through management</small>
                      </span>
                      <i />
                    </Button>)}
                  </div>
                  <label className="form-field">Contact phone (optional)<input type="tel" maxLength={30} value={servicePhone} onChange={e => setServicePhone(e.target.value)} placeholder="Number management can call" /></label>
                  <label className="form-field">What do you need help with? (optional)<textarea maxLength={2000} value={serviceDetails} onChange={e => setServiceDetails(e.target.value)} placeholder="Describe the issue or any access requirements" /></label>
                  <label className="form-field">Service address<input value={serviceAddress} onChange={e => setServiceAddress(e.target.value)} placeholder="Building, unit and street" maxLength={200} /></label>
                  <label className="form-field">Appointment date & time<DateTimeField label="Service appointment" min={today()} value={date} time={time} times={["9:00 AM", "10:30 AM", "2:00 PM", "4:30 PM"]} onChange={(d, t) => { setDate(d); if (t) setTime(t); }} /></label>
                  <div className="booking-summary">
                    <span>Service fee</span>
                    <b>Confirmed by management</b>
                  </div>
                  <Button className="primary-action" disabled={busy} onClick={() => {
                    if (!serviceAddress.trim() || !date || date < today()) {

                      notify("Enter an address and choose today or a future date.");
                      return;
                    }
                    if (serviceRequests.some(r => r.service === service && r.date === date && r.time === time && ["pending", "approved"].includes(r.status))) {

                      notify("You already saved this service appointment.");
                      return;
                    }
                    void perform("/records/services", "POST", { service, address: serviceAddress.trim(), phone: servicePhone.trim(), details: serviceDetails.trim(), date, time }, "Service request submitted to management.", () => setSheet("history"));
                  }}>Submit service request</Button>
                </>
              )}
              {sheet === "offer" && <>
                <div className="sheet-title">{offer}</div>
                <p className="sheet-subtitle">Sample marketplace offers. These cannot be redeemed or purchased.</p>
                <div className="record-list">
                  <div>
                    <b>Home cleaning · 20% off</b>
                    <p>Example welcome offer for Oak Residence residents. Provider and terms are not connected.</p>
                  </div>
                  <div>
                    <b>FreshFold Laundry · $8 off</b>
                    <p>Example pickup and delivery offer. Availability and ratings are sample data.</p>
                  </div>
                </div>
                <Button className="primary-action" onClick={() => setSheet(null)}>Back to Market</Button>
              </>}
              {sheet === "sos" && <ResidentEmergency contacts={data.communityContacts} targetId={requestTarget} />}
              {(sheet === "report" || sheet === "suspicious") && <>
                <div className="sheet-title">{sheet === "suspicious" ? "Report suspicious activity" : "Report a problem"}</div>
                <p className="sheet-subtitle">Submit a report for management review. This does not dispatch emergency responders.</p>
                <label className="form-field">Category<select value={category} onChange={e => setCategory(e.target.value)}>
                  {["Maintenance issue", "Suspicious activity", "Mailbox password attempts", "Door or gate tampering", "Accessibility barrier", "Noise or disturbance"].map(item => <option key={item}>{item}</option>)}
                </select></label>
                <label className="form-field">Details<textarea value={details} maxLength={2000} onChange={e => setDetails(e.target.value)} placeholder="What happened and where?" rows={4} /></label>
                <Button className="primary-action" disabled={busy || !details.trim()} onClick={() => saveReport(category)}>Submit report</Button>
              </>}
              {sheet === "request-update" && <RequestUpdate record={[...data.bookings, ...data.reports, ...data.services].find(r => r.id === requestTarget)} />}
              {sheet === "notifications" && <Notifications items={data.notifications} onRefresh={refresh} onOpen={n => {
                setRequestTarget(n.requestId);
                setSheet(n.kind === 'emergency' ? "sos" : n.kind === 'assistance' ? "services" : "request-update")
              }} />}
              {sheet === "contacts" && <ContactDirectory contacts={contacts} directory={data.communityContacts} onRefresh={refresh} loading={loading} />}
              {sheet === "profile" && <div className="profile-page">
                <header className="profile-hero">
                  <div className="profile-avatar" aria-hidden="true">{(profile.name.trim() || user.name).split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</div>
                  <span className="profile-eyebrow">YOUR COMMUNITY ACCOUNT</span>
                  <h2>{profile.name.trim() || user.name}</h2>
                  <p>{user.email}</p>
                  <span className="profile-role">{user.role === 'admin' ? 'Administrator' : 'Resident'}</span>
                </header>
                <section className="profile-card">
                  <div className="profile-card-heading"><span className="profile-symbol" aria-hidden="true">◎</span><div><h3>Personal details</h3><p>How you appear in your community</p></div></div>
                  <label className="form-field">Display name<input autoComplete="name" value={profile.name} maxLength={40} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="Your name" /></label>
                  <div className="profile-email"><span>Email address</span><b>{user.email}</b><small>Your sign-in email</small></div>
                  <label className="form-field profile-phone">
                    <span>Contact number <span className="profile-optional">(optional)</span></span>
                    <input type="tel" inputMode="tel" autoComplete="tel" maxLength={30} value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="e.g. +60 12-345 6789" aria-describedby="profile-phone-help" />
                    <small id="profile-phone-help">Leave blank if you prefer not to add a number.</small>
                  </label>
                </section>
                <section className="profile-card">
                  <div className="profile-card-heading"><span className="profile-symbol" aria-hidden="true">Aa</span><div><h3>Accessibility</h3><p>Make the app comfortable for you</p></div></div>
                  <label className="profile-toggle"><span><b>Larger text</b><small>Increase text size for easier reading</small></span><input type="checkbox" role="switch" checked={profile.largeText} onChange={e => setProfile({ ...profile, largeText: e.target.checked })} /><i aria-hidden="true" /></label>
                  <label className="profile-toggle"><span><b>Higher contrast</b><small>Make text and controls stand out</small></span><input type="checkbox" role="switch" checked={profile.contrast} onChange={e => setProfile({ ...profile, contrast: e.target.checked })} /><i aria-hidden="true" /></label>
                </section>
                <Button className="primary-action profile-save" disabled={busy || !profile.name.trim()} onClick={() => void saveProfile()}>{busy ? 'Saving…' : 'Save changes'}</Button>
                <Button className="profile-history" onClick={() => setSheet("history")}><span className="profile-symbol" aria-hidden="true">≡</span><span><b>My activity</b><small>Bookings, reports & service requests</small></span><Icon name="arrow" size="sm" /></Button>
                <Button className="profile-signout" onClick={() => void logout()}>Sign out</Button>
                <details className="profile-card profile-security">
                  <summary><span className="profile-symbol"><Icon name="lock" /></span><span><b>Password & security</b><small>Update your account password</small></span><span className="profile-expand" aria-hidden="true">+</span></summary>
                  <div className="profile-security-body">
                    <label className="form-field">Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></label>
                    <label className="form-field">New password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} value={newPassword} onChange={e => setNewPassword(e.target.value)} aria-describedby="profile-password-help" /></label>
                    <p id="profile-password-help">Use 12–128 characters. Updating signs out your other sessions.</p>
                    <Button className="outline-action" disabled={busy || newPassword.length < 12 || !currentPassword} onClick={() => void perform("/auth/password", "POST", { currentPassword, password: newPassword }, "Password updated. Other sessions signed out.", () => {
                      setCurrentPassword("");
                      setNewPassword("");
                    })}>Update password</Button>
                  </div>
                </details>
              </div>}
              {sheet === "history" && <>
                <div className="sheet-title">My bookings & reports</div>
                <p className="sheet-subtitle">Your submitted requests and management updates.</p>
                <div className="record-list">
                  <h3>Bookings</h3>
                  {!bookings.length && <p>No bookings yet.</p>}
                  {bookings.map(b => <div key={b.id}>
                    <b>{b.facility}</b>
                    <span>{b.date} · {b.time} · Malaysia time</span>
                    <span className={`status-pill ${b.status}`}>{b.status}</span>
                    <BookingHistory record={b} />
                    {data.facilities.find(f => f.name === b.facility && !f.isOpen) && <p className="contact-error">Facility currently closed: {data.facilities.find(f => f.name === b.facility)?.closureReason}. Contact management about this booking.</p>}
                    {bookingStarted(b) && ["pending", "approved"].includes(b.status) && <small>This slot has started. Contact management for changes.</small>}
                    <Button disabled={busy || bookingStarted(b) || ["cancelled", "completed", "resolved", "rejected"].includes(b.status)} onClick={() => {
                      if (window.confirm("Cancel this booking and release the slot?")) removeRecord("bookings", b.id)
                    }}>Cancel booking</Button>
                  </div>)}
                  <h3>Home-service requests</h3>
                  {!serviceRequests.length && <p>No service requests yet.</p>}
                  {serviceRequests.map(r => <div key={r.id}>
                    <b>{r.service}</b>
                    <span>{r.address}</span>
                    <span>{r.date} · {r.time} · {r.status.replaceAll("_", " ")}</span>
                    <Button disabled={busy || ["cancelled", "completed", "resolved", "rejected"].includes(r.status)} onClick={() => removeRecord("services", r.id)}>Cancel service request</Button>
                  </div>)}
                  <h3>Reports</h3>
                  {!reports.length && <p>No reports yet.</p>}
                  {reports.map(r => <div key={r.id}>
                    <b>{r.category}</b>
                    <span>{new Date(r.created).toLocaleString()} · {r.status.replaceAll("_", " ")}</span>
                    <p>{r.details}</p>
                    <Button disabled={busy || ["cancelled", "completed", "resolved", "rejected"].includes(r.status)} onClick={() => removeRecord("reports", r.id)}>Cancel report</Button>
                  </div>)}
                </div>
              </>}
              {sheet === "services" && <ResidentAssistance key={requestTarget || "all"} requests={data.assistance} onRefresh={refresh} targetId={requestTarget} />}

              {sheet === "notice" && <>
                <div className="sheet-title">Management notices</div>
                <div className="sheet-subtitle">Published by your community administrators.</div>
                <div className="notice-list">
                  {notices.length === 0 && <p>No notices published yet.</p>}
                  {notices.map(n => <div key={n.id}>
                    <span className={n.updated > data.noticesReadAt ? "unread" : ""} />
                    <span>
                      <b>{n.title}</b>
                      <small>{new Date(n.updated).toLocaleString()}</small>
                      <p className="resident-notice-body">{n.body}</p>
                    </span>
                  </div>)}
                </div>
                <Button className="primary-action" disabled={busy} onClick={() => void perform("/notices/read", "POST", {}, "Notices marked as read.")}>Mark all as read</Button>
              </>}

            </section>
          </div>
        )}
        {toast && <div className="toast" role="status"><Icon name="check" size="sm" />{toast}</div>}
      </div>
    </div>
  );
}

"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Coffee,
  Globe2,
  GraduationCap,
  Menu,
  MessageSquare,
  Mic,
  MonitorUp,
  Search,
  ShieldCheck,
  Users,
  Video,
  X,
} from "lucide-react";
import Brand from "./Brand";
import { useAuth } from "./AuthProvider";
import { JoinDialog } from "./MeetingDialogs";
import Modal from "./Modal";

const features = [
  {
    id: "schedule",
    name: "Schedule",
    icon: CalendarDays,
    title: "Make time for what matters.",
    body: "Plan your next conversation and give everyone a place to meet. Your upcoming meetings, invitations, and meeting details stay together.",
    bullets: [
      "Choose a date, time, and duration",
      "Add a topic and description",
      "Copy an invitation to share with your team",
    ],
    color: "schedule",
  },
  {
    id: "chat",
    name: "Team Chat",
    icon: MessageSquare,
    title: "Keep the conversation going.",
    body: "Share a thought, ask a question, or send a quick update while you meet. Everyone in the call can follow along.",
    bullets: [
      "Send messages to everyone in the meeting",
      "Catch up on the conversation when you join",
      "Keep your meeting chat in one place",
    ],
    color: "chat",
  },
  {
    id: "meetings",
    name: "Meetings",
    icon: Video,
    title: "A little face time goes a long way.",
    body: "Bring people together, wherever they are. Start a video meeting in your browser or join with an invitation — and get right to the conversation.",
    bullets: [
      "Connect with video and audio",
      "Join with a meeting ID or invitation link",
      "Choose a gallery or speaker view",
    ],
    color: "meetings",
  },
  {
    id: "sharing",
    name: "Screen Sharing",
    icon: MonitorUp,
    title: "Let everyone see your point.",
    body: "Walk through a presentation, review a design, or work through an idea together. Share a tab, window, or your whole screen.",
    bullets: [
      "Present directly from your browser",
      "Switch between your camera and your screen",
      "Keep talking while you share",
    ],
    color: "sharing",
  },
  {
    id: "controls",
    name: "Host Controls",
    icon: ShieldCheck,
    title: "A space you can make your own.",
    body: "Keep your meeting focused with simple controls. See who is in the room and manage the conversation from one place.",
    bullets: [
      "Mute one participant or everyone",
      "Manage raised hands and participants",
      "End the meeting for everyone when you're done",
    ],
    color: "controls",
  },
] as const;
const questions = [
  [
    "Do I need an account to join a meeting?",
    "You can join as a guest. Select Join Meeting, enter the meeting ID or invitation link, and choose your display name. An account is needed to start or schedule your own meetings.",
  ],
  [
    "How do I invite someone to a meeting?",
    "Create or schedule a meeting in your Workplace, then copy the invitation. Send the link to the people you want to meet with. They can open it in their browser.",
  ],
  [
    "Can I join with my camera or microphone off?",
    "Yes. You can check your devices before joining, turn off your video, or choose not to connect to audio. You can change these settings during the meeting.",
  ],
  [
    "Where will I find my scheduled meetings?",
    "Sign in and open Workplace. Your Home agenda shows your meetings for the day, and the Meetings tab brings your upcoming and recent meetings together.",
  ],
] as const;

export default function Landing() {
  const { user } = useAuth();
  const [selected, setSelected] = useState(2),
    [announcement, setAnnouncement] = useState(true);
  const [join, setJoin] = useState(false),
    [mobile, setMobile] = useState(false),
    [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState<"products" | "meet" | null>(null),
    [search, setSearch] = useState(false),
    [query, setQuery] = useState("");
  const header = useRef<HTMLElement>(null);
  const closeJoin = useCallback(() => setJoin(false), []);
  const closeSearch = useCallback(() => setSearch(false), []);
  const feature = features[selected];
  const workplace = user ? "/workplace" : "/signin";
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 40);
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(null);
        setMobile(false);
      }
    };
    const outside = (event: MouseEvent) => {
      if (!header.current?.contains(event.target as Node)) {
        setMenu(null);
        setMobile(false);
      }
    };
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    document.addEventListener("keydown", escape);
    document.addEventListener("mousedown", outside);
    return () => {
      window.removeEventListener("scroll", scroll);
      document.removeEventListener("keydown", escape);
      document.removeEventListener("mousedown", outside);
    };
  }, []);
  function joinMeeting() {
    setJoin(true);
    setMenu(null);
    setMobile(false);
  }
  function showFeature(index: number) {
    setSelected(index);
    setMenu(null);
    setMobile(false);
  }
  function openSearch() {
    setSearch(true);
    setMenu(null);
    setMobile(false);
  }
  function focusTab(index: number) {
    setSelected(index);
    document.getElementById(`product-tab-${features[index].id}`)?.focus();
  }
  return (
    <div className="zoom-landing">
      <a className="landing-skip" href="#landing-main">
        Skip to content
      </a>
      <header
        ref={header}
        className={`landing-header ${scrolled ? "is-scrolled" : ""}`}
      >
        <div className="landing-nav-shell">
          <Link className="landing-logo" href="/" aria-label="Zoom home">
            <Brand />
          </Link>
          <nav className="landing-primary-nav" aria-label="Main navigation">
            <button
              className="landing-nav-link"
              aria-expanded={menu === "products"}
              aria-controls="landing-products-menu"
              onClick={() =>
                setMenu((v) => (v === "products" ? null : "products"))
              }
            >
              Products <ChevronDown size={14} />
            </button>
            <a
              className="landing-nav-link"
              href="#solutions"
              onClick={() => setMenu(null)}
            >
              Solutions
            </a>
            <a
              className="landing-nav-link"
              href="#get-started"
              onClick={() => setMenu(null)}
            >
              Plans
            </a>
            <a
              className="landing-nav-link"
              href="#resources"
              onClick={() => setMenu(null)}
            >
              Resources
            </a>
          </nav>
          <div className="landing-nav-actions">
            <button
              className="landing-nav-icon desktop-search"
              aria-label="Search the site"
              onClick={openSearch}
            >
              <Search size={21} />
            </button>
            <span className="landing-language" aria-label="Language: English">
              <Globe2 size={20} />
            </span>
            <div className="landing-meet-nav">
              <button
                className="landing-nav-link"
                aria-expanded={menu === "meet"}
                aria-controls="landing-meet-menu"
                onClick={() => setMenu((v) => (v === "meet" ? null : "meet"))}
              >
                Meet <ChevronDown size={14} />
              </button>
              {menu === "meet" && (
                <div
                  id="landing-meet-menu"
                  className="landing-dropdown meet-dropdown"
                >
                  <button onClick={joinMeeting}>
                    <Video size={18} />
                    <span>Join Meeting</span>
                  </button>
                  <Link href={workplace}>
                    <Users size={18} />
                    <span>Host a meeting</span>
                  </Link>
                  <Link href={workplace}>
                    <CalendarDays size={18} />
                    <span>Schedule a meeting</span>
                  </Link>
                </div>
              )}
            </div>
            <Link
              className="landing-signin"
              href={user ? "/workplace" : "/signin"}
            >
              {user ? "My Account" : "Sign In"}
            </Link>
            <a
              className="landing-support"
              href="https://support.zoom.com/"
              target="_blank"
              rel="noreferrer"
            >
              Support
            </a>
            <button
              className="landing-button landing-button-light nav-join"
              onClick={joinMeeting}
            >
              Join Meeting
            </button>
            <Link
              className="landing-button landing-button-blue nav-signup"
              href={user ? "/workplace" : "/signup"}
            >
              {user ? "Open Workplace" : "Sign Up Free"}
            </Link>
            <button
              className="landing-nav-icon mobile-menu-toggle"
              aria-label={mobile ? "Close navigation" : "Open navigation"}
              aria-expanded={mobile}
              aria-controls="landing-mobile-menu"
              onClick={() => setMobile((v) => !v)}
            >
              {mobile ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        {menu === "products" && (
          <div
            id="landing-products-menu"
            className="landing-dropdown products-dropdown"
          >
            <div>
              <span className="landing-menu-eyebrow">Zoom Workplace</span>
              <h2>Bring your team together.</h2>
              <p>Meet, share, and get things done in one place.</p>
              <Link className="landing-menu-cta" href={workplace}>
                Open your Workplace <ArrowRight size={16} />
              </Link>
            </div>
            <div className="landing-product-links">
              {features.map((item, index) => (
                <a
                  key={item.id}
                  href="#products"
                  onClick={() => showFeature(index)}
                >
                  <item.icon size={22} />
                  <span>
                    {item.name}
                    <small>{item.bullets[0]}</small>
                  </span>
                  <ArrowRight size={16} />
                </a>
              ))}
            </div>
          </div>
        )}
        {mobile && (
          <nav
            id="landing-mobile-menu"
            className="landing-mobile-menu"
            aria-label="Mobile navigation"
          >
            <a href="#products" onClick={() => setMobile(false)}>
              Products <ArrowRight size={17} />
            </a>
            <a href="#solutions" onClick={() => setMobile(false)}>
              Solutions <ArrowRight size={17} />
            </a>
            <a href="#get-started" onClick={() => setMobile(false)}>
              Plans <ArrowRight size={17} />
            </a>
            <a href="#resources" onClick={() => setMobile(false)}>
              Resources <ArrowRight size={17} />
            </a>
            <button onClick={openSearch}>
              Search <Search size={18} />
            </button>
            <button onClick={joinMeeting}>
              Join Meeting <Video size={18} />
            </button>
            <Link href={workplace}>
              {user ? "Open Workplace" : "Sign In"}
              <ArrowRight size={17} />
            </Link>
          </nav>
        )}
      </header>
      <main id="landing-main">
        <section className="landing-hero" aria-labelledby="landing-heading">
          {announcement && (
            <div className="landing-announcement">
              <span>A little connection can lead to your next big idea.</span>
              <Link href={user ? "/workplace" : "/signup"}>
                Get started <ArrowRight size={15} />
              </Link>
              <button
                aria-label="Dismiss announcement"
                onClick={() => setAnnouncement(false)}
              >
                <X size={17} />
              </button>
            </div>
          )}
          <div className="landing-hero-copy">
            <h1 id="landing-heading">
              Find out what&apos;s possible
              <br />
              when work connects
            </h1>
            <p>
              Bring your people and ideas together.{" "}
              <br className="mobile-break" /> Meet from anywhere with Zoom
              Workplace.
            </p>
            <div className="landing-hero-actions">
              <a
                className="landing-button landing-button-navy"
                href="#products"
              >
                Explore products
              </a>
              <Link
                className="landing-button landing-button-light"
                href={user ? "/workplace" : "/signup"}
              >
                {user ? "Open Workplace" : "Sign Up Free"}
              </Link>
            </div>
          </div>
          <div
            className="landing-carousel"
            role="region"
            aria-roledescription="carousel"
            aria-label="Featured products"
          >
            <div className="landing-carousel-window">
              <div
                className="landing-product-track"
                style={
                  { "--selected-product": selected } as React.CSSProperties
                }
              >
                {features.map((item, index) => (
                  <button
                    key={item.id}
                    className={`landing-product-card ${item.color} ${selected === index ? "selected" : ""}`}
                    aria-label={`Explore ${item.name}`}
                    tabIndex={index === selected ? 0 : -1}
                    onClick={() => {
                      showFeature(index);
                      document.getElementById("products")?.scrollIntoView({
                        behavior: window.matchMedia(
                          "(prefers-reduced-motion: reduce)",
                        ).matches
                          ? "instant"
                          : "smooth",
                      });
                    }}
                  >
                    <ProductPreview id={item.id} />
                  </button>
                ))}
              </div>
            </div>
            <div className="landing-carousel-controls">
              <button
                aria-label="Previous product"
                disabled={selected === 0}
                onClick={() => setSelected((v) => v - 1)}
              >
                <ArrowLeft size={23} />
              </button>
              <div className="landing-carousel-dots">
                {features.map((item, index) => (
                  <button
                    key={item.id}
                    className={selected === index ? "active" : ""}
                    aria-label={`Show ${item.name}`}
                    aria-current={selected === index ? "true" : undefined}
                    onClick={() => setSelected(index)}
                  />
                ))}
              </div>
              <button
                aria-label="Next product"
                disabled={selected === features.length - 1}
                onClick={() => setSelected((v) => v + 1)}
              >
                <ArrowRight size={23} />
              </button>
              <span className="landing-sr-only" aria-live="polite">
                {feature.name}, product {selected + 1} of {features.length}
              </span>
            </div>
          </div>
        </section>
        <section
          id="products"
          className="landing-products-section landing-section"
          aria-labelledby="products-heading"
        >
          <span className="landing-eyebrow">ZOOM WORKPLACE</span>
          <h2 id="products-heading">
            One place for your
            <br />
            next great conversation.
          </h2>
          <div
            className="landing-product-tabs"
            role="tablist"
            aria-label="Zoom Workplace products"
          >
            {features.map((item, index) => (
              <button
                key={item.id}
                id={`product-tab-${item.id}`}
                role="tab"
                aria-selected={selected === index}
                aria-controls="landing-feature-panel"
                tabIndex={selected === index ? 0 : -1}
                className={selected === index ? "active" : ""}
                onClick={() => setSelected(index)}
                onKeyDown={(event) => {
                  let next: number | undefined;
                  if (event.key === "ArrowRight")
                    next = (selected + 1) % features.length;
                  if (event.key === "ArrowLeft")
                    next = (selected + features.length - 1) % features.length;
                  if (event.key === "Home") next = 0;
                  if (event.key === "End") next = features.length - 1;
                  if (next !== undefined) {
                    event.preventDefault();
                    focusTab(next);
                  }
                }}
              >
                <item.icon size={20} />
                {item.name}
              </button>
            ))}
          </div>
          <div
            className="landing-feature-panel"
            id="landing-feature-panel"
            role="tabpanel"
            aria-labelledby={`product-tab-${feature.id}`}
          >
            <div className="landing-feature-copy">
              <feature.icon className="landing-feature-icon" size={30} />
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
              <ul>
                {feature.bullets.map((item) => (
                  <li key={item}>
                    <Check size={18} />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                className="landing-button landing-button-blue"
                href={user ? "/workplace" : "/signup"}
              >
                {user ? "Go to Workplace" : "Get started free"}
                <ArrowRight size={17} />
              </Link>
            </div>
            <div
              className={`landing-feature-art ${feature.color}`}
              aria-hidden="true"
            >
              <ProductPreview id={feature.id} />
            </div>
          </div>
        </section>
        <section
          id="solutions"
          className="landing-solutions landing-section"
          aria-labelledby="solutions-heading"
        >
          <span className="landing-eyebrow">BUILT AROUND YOU</span>
          <h2 id="solutions-heading">
            Wherever you work.
            <br />
            Whoever you meet.
          </h2>
          <div className="landing-solution-grid">
            {[
              {
                icon: Users,
                title: "For your team",
                body: "Keep a distributed team close. Make space for check-ins, project reviews, and the ideas that move work forward.",
              },
              {
                icon: GraduationCap,
                title: "For learning together",
                body: "Bring your study group into the same room. Share your screen, ask questions, and work through something new.",
              },
              {
                icon: Coffee,
                title: "For everyday connections",
                body: "Catch up with someone across town or across the world. All you need is a meeting link and a moment to connect.",
              },
            ].map((item) => (
              <article key={item.title}>
                <item.icon size={31} />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <Link href={user ? "/workplace" : "/signup"}>
                  Let&apos;s connect <ArrowRight size={17} />
                </Link>
              </article>
            ))}
          </div>
        </section>
        <section
          id="get-started"
          className="landing-start-section"
          aria-labelledby="start-heading"
        >
          <div>
            <span className="landing-eyebrow">YOUR FREE WORKPLACE</span>
            <h2 id="start-heading">
              Good conversations
              <br />
              start here.
            </h2>
            <p>
              Create an account, invite your people, and make your next meeting
              happen.
            </p>
            <div className="landing-start-actions">
              <Link
                className="landing-button landing-button-blue"
                href={user ? "/workplace" : "/signup"}
              >
                {user ? "Open Workplace" : "Sign Up Free"}
                <ArrowRight size={17} />
              </Link>
              <button
                className="landing-button landing-button-outline"
                onClick={joinMeeting}
              >
                Join Meeting
              </button>
            </div>
          </div>
          <div className="landing-start-art" aria-hidden="true">
            <div className="landing-start-orbit orbit-one" />
            <div className="landing-start-orbit orbit-two" />
            <div className="landing-start-camera">
              <Video size={88} fill="currentColor" strokeWidth={1.1} />
            </div>
            <span className="landing-start-bubble bubble-chat">
              <MessageSquare size={34} />
            </span>
            <span className="landing-start-bubble bubble-calendar">
              <CalendarDays size={34} />
            </span>
            <span className="landing-start-bubble bubble-share">
              <MonitorUp size={34} />
            </span>
          </div>
        </section>
        <section
          id="resources"
          className="landing-faq landing-section"
          aria-labelledby="faq-heading"
        >
          <div>
            <span className="landing-eyebrow">
              A LITTLE HELP GETTING STARTED
            </span>
            <h2 id="faq-heading">
              Let&apos;s get
              <br />
              you connected.
            </h2>
            <a
              href="https://support.zoom.com/"
              target="_blank"
              rel="noreferrer"
            >
              Visit Zoom Support <ArrowRight size={17} />
            </a>
          </div>
          <div className="landing-faq-list">
            {questions.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <ChevronDown size={20} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <div className="landing-footer-top">
          <Link href="/" className="landing-logo" aria-label="Zoom home">
            <Brand />
          </Link>
          <div>
            <h3>Workplace</h3>
            <Link href={workplace}>Open Workplace</Link>
            <button onClick={joinMeeting}>Join a meeting</button>
            <a href="#products" onClick={() => setSelected(0)}>
              Schedule a meeting
            </a>
          </div>
          <div>
            <h3>Explore</h3>
            <a href="#products">Products</a>
            <a href="#solutions">Solutions</a>
            <a href="#get-started">Get started</a>
          </div>
          <div>
            <h3>Resources</h3>
            <a href="#resources">Frequently asked questions</a>
            <a
              href="https://support.zoom.com/"
              target="_blank"
              rel="noreferrer"
            >
              Zoom Support <ArrowRight size={12} />
            </a>
            <Link href="/signin">Sign In</Link>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <p>
            © {new Date().getFullYear()} Zoom Workplace · Independent assignment
            project.
          </p>
          <span>
            <Globe2 size={15} />
            English
          </span>
        </div>
      </footer>
      {join && <JoinDialog onClose={closeJoin} />}
      {search && (
        <Modal title="Search" onClose={closeSearch}>
          <div className="dialog-form landing-search-content">
            <label>
              Search products
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Meetings, sharing, chat…"
                type="search"
              />
            </label>
            <div className="landing-search-results">
              {features
                .map((item, index) => ({ item, index }))
                .filter(({ item }) =>
                  `${item.name} ${item.title} ${item.body}`
                    .toLowerCase()
                    .includes(query.trim().toLowerCase()),
                )
                .map(({ item, index }) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      showFeature(index);
                      closeSearch();
                      document
                        .getElementById("products")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <item.icon size={22} />
                    <span>
                      {item.name}
                      <small>{item.bullets[0]}</small>
                    </span>
                    <ArrowRight size={18} />
                  </button>
                ))}
              {!features.some((item) =>
                `${item.name} ${item.title} ${item.body}`
                  .toLowerCase()
                  .includes(query.trim().toLowerCase()),
              ) && <p>No products found. Try “meetings” or “chat”.</p>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ProductPreview({ id }: { id: (typeof features)[number]["id"] }) {
  if (id === "meetings")
    return (
      <Image
        className="landing-meetings-art"
        src="/landing/meetings.jpg"
        alt="Zoom Meetings with three people connecting by video"
        width={600}
        height={801}
        priority
      />
    );
  const item = features.find((feature) => feature.id === id)!;
  return (
    <div className={`product-preview preview-product-${id}`} aria-hidden="true">
      <h3>
        <item.icon size={24} />
        {item.name}
      </h3>
      {id === "schedule" && (
        <div className="preview-calendar">
          <div className="preview-calendar-heading">
            <strong>October</strong>
            <span>2026</span>
          </div>
          <div className="preview-calendar-grid">
            {"MTWTFSS".split("").map((day, index) => (
              <small key={`day-${index}`}>{day}</small>
            ))}
            {Array.from({ length: 28 }, (_, index) => (
              <span className={index === 8 ? "chosen" : ""} key={index}>
                {index + 1}
              </span>
            ))}
          </div>
          <div className="preview-agenda">
            <span className="preview-agenda-dot" />
            <div>
              <strong>Design review</strong>
              <small>10:00 AM – 10:30 AM</small>
            </div>
            <Video size={17} />
          </div>
          <div className="preview-agenda">
            <span className="preview-agenda-dot purple" />
            <div>
              <strong>Team catch-up</strong>
              <small>2:00 PM – 3:00 PM</small>
            </div>
            <Video size={17} />
          </div>
        </div>
      )}
      {id === "chat" && (
        <div className="preview-chat">
          <div className="preview-chat-heading">
            <span className="mock-avatar">D</span>
            <div>
              <strong>Design team</strong>
              <small>Meeting chat</small>
            </div>
            <Video size={18} />
          </div>
          <div className="preview-message">
            <span className="mock-avatar lilac">M</span>
            <div>
              <strong>Maya</strong>
              <p>Ready to bring this idea to life? ✨</p>
              <small>10:02 AM</small>
            </div>
          </div>
          <div className="preview-message">
            <span className="mock-avatar peach">A</span>
            <div>
              <strong>Alex</strong>
              <p>Absolutely. Let&apos;s take a look together!</p>
              <small>10:03 AM</small>
            </div>
          </div>
          <div className="preview-chat-reply">Sounds like a plan. 🙌</div>
          <div className="preview-chat-compose">
            Message everyone…
            <ArrowRight size={15} />
          </div>
        </div>
      )}
      {id === "sharing" && (
        <div className="preview-share">
          <div className="preview-share-bar">
            <span />
            <span />
            <span />
            <small>You are sharing your screen</small>
          </div>
          <div className="preview-slide">
            <small>LET&apos;S BUILD SOMETHING GREAT</small>
            <strong>
              A new
              <br />
              perspective.
            </strong>
            <div className="preview-slide-shapes">
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="preview-share-people">
            <span className="mock-avatar">M</span>
            <span className="mock-avatar lilac">J</span>
            <span className="mock-avatar peach">A</span>
            <span>Working together</span>
          </div>
        </div>
      )}
      {id === "controls" && (
        <div className="preview-participants">
          <div className="preview-participants-heading">
            <strong>Participants (3)</strong>
            <Users size={19} />
          </div>
          {[
            { name: "You (Host)", initial: "Y", color: "" },
            { name: "Maya", initial: "M", color: "lilac" },
            { name: "Alex", initial: "A", color: "peach" },
          ].map((person) => (
            <div className="preview-participant" key={person.name}>
              <span className={`mock-avatar ${person.color}`}>
                {person.initial}
              </span>
              <strong>{person.name}</strong>
              <Mic size={17} />
              <Video size={17} />
            </div>
          ))}
          <div className="preview-mute">
            <span>Mute All</span>
            <span>Invite</span>
          </div>
          <div className="preview-control-note">
            <ShieldCheck size={19} />
            <span>
              Your meeting.
              <br />
              <strong>Your space to connect.</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

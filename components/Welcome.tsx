"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import Brand from "./Brand";
import { JoinDialog } from "./MeetingDialogs";

export default function Welcome() {
  const [join, setJoin] = useState(false);
  const close = useCallback(() => setJoin(false), []);
  return (
    <main className="welcome-page">
      <div className="welcome-brand">
        <Brand />
        <h1>Workplace</h1>
      </div>
      <div className="welcome-actions">
        <Link className="button primary" href="/signin">
          Sign In
        </Link>
        <Link className="button secondary" href="/signup">
          Sign Up
        </Link>
        <button className="button secondary" onClick={() => setJoin(true)}>
          Join Meeting
        </button>
      </div>
      <footer className="welcome-footer">
        <a
          href="https://www.zoom.com/en/about/"
          target="_blank"
          rel="noreferrer"
        >
          About Zoom
        </a>
        <span>
          English <ChevronDown size={12} />
        </span>
        <small>Independent assignment demo</small>
      </footer>
      {join && <JoinDialog onClose={close} />}
    </main>
  );
}

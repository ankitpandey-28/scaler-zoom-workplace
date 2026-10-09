"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Copy, Video } from "lucide-react";
import Modal from "./Modal";
import { api, copyText, formatId, Meeting, parseMeetingId } from "@/lib/api";
import { useAuth } from "./AuthProvider";

export function JoinDialog({
  onClose,
  sharing = false,
}: {
  onClose: () => void;
  sharing?: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [name, setName] = useState(
    () => user?.display_name || localStorage.getItem("zoom-name") || "",
  );
  const [audio, setAudio] = useState(true),
    [video, setVideo] = useState(true);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function join(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const id = parseMeetingId(identifier);
      if (!/^\d{11}$/.test(id))
        throw new Error("Enter an 11-digit meeting ID or a valid invite link.");
      const meeting = await api<Meeting>(`/meetings/${id}`);
      if (["ended", "cancelled"].includes(meeting.status))
        throw new Error("This meeting has ended or was cancelled.");
      localStorage.setItem("zoom-name", name.trim());
      router.push(
        `/meeting/${id}?audio=${audio ? 1 : 0}&video=${video ? 1 : 0}${sharing ? "&share=1" : ""}`,
      );
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title={sharing ? "Share screen in a meeting" : "Join Meeting"}
      onClose={onClose}
    >
      <form onSubmit={join} className="dialog-form">
        <label>
          Meeting ID or invite link
          <input
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Enter meeting ID or invite link"
            autoComplete="off"
          />
        </label>
        <label>
          Your name
          <input
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={!audio}
            onChange={(e) => setAudio(!e.target.checked)}
          />{" "}
          Don’t connect to audio
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={!video}
            onChange={(e) => setVideo(!e.target.checked)}
          />{" "}
          Turn off my video
        </label>
        {error && (
          <div role="alert" className="form-error">
            {error}
          </div>
        )}
        <footer className="dialog-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy || !name.trim()}>
            {busy ? "Checking meeting…" : "Join"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

export function ScheduleDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (meeting: Meeting) => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState(`${user?.display_name}’s Zoom Meeting`);
  const [description, setDescription] = useState("");
  const [start, setStart] = useState(() => {
    const value = new Date(Date.now() + 3600000);
    value.setSeconds(0, 0);
    return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  const [duration, setDuration] = useState(30),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const meeting = await api<Meeting>("/meetings", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          scheduled_at: new Date(start).toISOString(),
          duration_minutes: duration,
        }),
      });
      onCreated(meeting);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <Modal title="Schedule Meeting" onClose={onClose} wide>
      <form className="dialog-form" onSubmit={submit}>
        <label>
          Topic
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
          />
        </label>
        <label>
          Description <span className="muted">(optional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="What will you discuss?"
          />
        </label>
        <div className="form-row">
          <label>
            When
            <input
              type="datetime-local"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Duration
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              {[15, 30, 45, 60, 90, 120, 180, 240, 480].map((n) => (
                <option key={n} value={n}>
                  {n < 60 ? `${n} minutes` : `${n / 60} hours`}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="timezone">
          Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
        </p>
        <div className="schedule-info">
          <Video size={19} />
          <div>
            <strong>Zoom Meeting</strong>
            <p>A unique meeting ID and invite link will be generated.</p>
          </div>
        </div>
        {error && (
          <div role="alert" className="form-error">
            {error}
          </div>
        )}
        <footer className="dialog-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy || !title.trim()}>
            <CalendarDays size={16} />
            {busy ? "Scheduling…" : "Save"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

export function InviteDialog({
  meeting,
  onClose,
}: {
  meeting: Meeting;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false),
    [error, setError] = useState("");
  const url = `${window.location.origin}${meeting.invite_path}`;
  const invitation = `${meeting.host_name} is inviting you to a Zoom meeting.\n\nTopic: ${meeting.title}\nTime: ${new Date(meeting.scheduled_at).toLocaleString()}\n\nJoin Zoom Meeting\n${url}\n\nMeeting ID: ${formatId(meeting.id)}`;
  return (
    <Modal title="Meeting invitation" onClose={onClose}>
      <div className="dialog-form">
        <h3 className="invite-topic">{meeting.title}</h3>
        <p className="muted">
          {new Date(meeting.scheduled_at).toLocaleString()} ·{" "}
          {meeting.duration_minutes} minutes
        </p>
        <label>
          Meeting ID
          <input readOnly value={formatId(meeting.id)} />
        </label>
        <label>
          Invite link
          <input readOnly value={url} onFocus={(e) => e.target.select()} />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <footer className="dialog-footer">
          <button className="button secondary" onClick={onClose}>
            Done
          </button>
          <button
            className="button primary"
            onClick={async () => {
              try {
                await copyText(invitation);
                setCopied(true);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied!" : "Copy invitation"}
          </button>
        </footer>
      </div>
    </Modal>
  );
}

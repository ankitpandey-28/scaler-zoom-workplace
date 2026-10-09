"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Copy,
  Grid2X2,
  Hand,
  Info,
  LayoutPanelTop,
  Loader2,
  LockKeyhole,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  Send,
  ShieldCheck,
  UserPlus,
  Users,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { api, copyText, formatId, Meeting, Participant } from "@/lib/api";
import { useMeeting } from "@/lib/useMeeting";
import VideoTile, { VideoElement } from "./VideoTile";
import { InviteDialog } from "./MeetingDialogs";
import Modal from "./Modal";
import Brand from "./Brand";
import { useAuth } from "./AuthProvider";

export default function MeetingRoom({ identifier }: { identifier: string }) {
  const router = useRouter(),
    room = useMeeting(identifier);
  const { user } = useAuth();
  const [meeting, setMeeting] = useState<Meeting | null>(null),
    [loadError, setLoadError] = useState("");
  const [name, setName] = useState(""),
    [panel, setPanel] = useState<"participants" | "chat" | null>(null);
  const [invite, setInvite] = useState(false),
    [leaveDialog, setLeaveDialog] = useState(false),
    [info, setInfo] = useState(false);
  const [chat, setChat] = useState(""),
    [view, setView] = useState<"gallery" | "speaker">("gallery"),
    [elapsed, setElapsed] = useState(0),
    [copied, setCopied] = useState(false);
  const [unread, setUnread] = useState(0),
    messageCount = useRef(0),
    chatEnd = useRef<HTMLDivElement>(null);
  const [shareOnJoin, setShareOnJoin] = useState(false);
  const closeInvite = useCallback(() => setInvite(false), []);
  useEffect(() => {
    api<Meeting>(`/meetings/${identifier}`)
      .then(setMeeting)
      .catch((e) => setLoadError(e.message));
    setName(user?.display_name || localStorage.getItem("zoom-name") || "");
    setShareOnJoin(new URLSearchParams(location.search).get("share") === "1");
  }, [identifier]);
  useEffect(() => {
    if (user && room.status === "preview") setName(user.display_name);
  }, [user, room.status]);
  useEffect(() => {
    if (room.status !== "connected") return;
    const timer = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [room.status]);
  useEffect(() => {
    if (panel === "chat") {
      chatEnd.current?.scrollIntoView({ behavior: "smooth" });
      setUnread(0);
    } else if (room.messages.length > messageCount.current)
      setUnread((n) => n + room.messages.length - messageCount.current);
    messageCount.current = room.messages.length;
  }, [room.messages, panel]);
  const self: Participant = room.participants.find(
    (p) => p.id === room.selfId,
  ) || {
    id: room.selfId,
    display_name: name,
    is_host: meeting?.is_host || false,
    audio: room.audio,
    video: room.video,
    sharing: room.sharing,
    hand: room.hand,
  };
  const selfCurrent = {
    ...self,
    audio: room.audio,
    video: room.video,
    sharing: room.sharing,
    hand: room.hand,
  };
  const ordered = [
    selfCurrent,
    ...room.participants.filter((p) => p.id !== room.selfId),
  ];
  const presenter = ordered.find((p) => p.sharing),
    spotlight =
      presenter ||
      ordered.find((p) => p.id !== room.selfId && p.video) ||
      selfCurrent;
  const connected = ["connected", "disconnected"].includes(room.status);
  async function join(event?: React.FormEvent) {
    event?.preventDefault();
    localStorage.setItem("zoom-name", name.trim());
    if (shareOnJoin && room.status === "preview") await room.toggleSharing();
    await room.connect(name.trim());
  }
  function leave() {
    room.leave();
    router.push(user ? "/workplace" : "/");
  }
  function sendChat(event: React.FormEvent) {
    event.preventDefault();
    if (chat.trim() && room.status === "connected") {
      room.send({ type: "chat", body: chat.trim() });
      setChat("");
    }
  }
  if (
    loadError ||
    (meeting && ["ended", "cancelled"].includes(meeting.status)) ||
    ["ended", "removed", "session-expired"].includes(room.status)
  ) {
    return (
      <div className="room-result">
        <Brand />
        <div>
          <ShieldCheck size={44} />
          <h1>
            {room.status === "session-expired"
              ? "You’ve been signed out"
              : room.status === "removed"
                ? "You’ve been removed"
                : loadError
                  ? "Unable to join meeting"
                  : "This meeting has ended"}
          </h1>
          <p>
            {room.status === "session-expired"
              ? meeting?.is_host
                ? "Sign in again to continue as the host."
                : "Your session has ended. Return home to join again."
              : room.status === "removed"
                ? "The host removed you from this meeting."
                : loadError ||
                  "Thank you for joining. We’ll see you next time."}
          </p>
          <button className="button primary" onClick={leave}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }
  if (!meeting)
    return (
      <div className="room-result">
        <Loader2 className="spin" size={32} />
        <p>Getting your meeting ready…</p>
      </div>
    );
  if (!connected)
    return (
      <div className="prejoin-page">
        <header>
            <a className="brand" href={user ? "/workplace" : "/"}>
            <Brand workplace />
          </a>
          <a
            className="text-button"
            href={
              user
                ? "/workplace"
                : `/signin?next=${encodeURIComponent(`/meeting/${identifier}`)}`
            }
          >
            {user ? "Back to Home" : "Sign In"}
          </a>
        </header>
        <main className="prejoin-main">
          <div className="preview-column">
            <div className="preview-video">
              <VideoTile
                participant={{ ...selfCurrent, display_name: name || "You" }}
                stream={room.stream}
                self
              />
            </div>
            <div className="preview-controls">
              <button
                aria-label={
                  room.audio ? "Mute microphone" : "Unmute microphone"
                }
                className={`preview-control ${!room.audio ? "off" : ""}`}
                onClick={room.toggleAudio}
              >
                {room.audio ? <Mic size={22} /> : <MicOff size={22} />}
              </button>
              <button
                aria-label={room.video ? "Turn off camera" : "Turn on camera"}
                className={`preview-control ${!room.video ? "off" : ""}`}
                onClick={room.toggleVideo}
              >
                {room.video ? <Video size={22} /> : <VideoOff size={22} />}
              </button>
            </div>
            {room.mediaError && (
              <p className="media-notice" role="status">
                {room.mediaError}
              </p>
            )}
          </div>
          <form className="prejoin-form" onSubmit={join}>
            <span className="eyebrow">Join Meeting</span>
            <h1>{meeting.title}</h1>
            <p className="meeting-id-label">
              Meeting ID: {formatId(identifier)}
            </p>
            <label>
              Your name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={60}
              />
            </label>
            {room.error && (
              <p className="form-error" role="alert">
                {room.error}
              </p>
            )}
            <button
              className="button primary join-large"
              disabled={
                !name.trim() || room.status === "connecting" || !room.stream
              }
            >
              {room.status === "connecting" ? (
                <>
                  <Loader2 className="spin" size={18} />
                  Joining…
                </>
              ) : (
                "Join Meeting"
              )}
            </button>
            <p className="prejoin-note">
              {meeting.is_host
                ? "You’re the host of this meeting."
                : `Hosted by ${meeting.host_name}`}
              <br />
              Check your audio and video before you join.
            </p>
          </form>
        </main>
        <footer>Zoom Workplace</footer>
      </div>
    );
  return (
    <div className="meeting-room">
      <header className="room-header">
        <div className="room-heading">
          <ShieldCheck color="#54bd75" size={20} />
          <button
            className="icon-button dark"
            aria-label="Meeting information"
            onClick={() => setInfo(true)}
          >
            <Info size={18} />
          </button>
          <h1>{meeting.title}</h1>
          <span className="room-duration">{`${Math.floor(elapsed / 3600)
            .toString()
            .padStart(2, "0")}:${Math.floor((elapsed / 60) % 60)
            .toString()
            .padStart(
              2,
              "0",
            )}:${(elapsed % 60).toString().padStart(2, "0")}`}</span>
        </div>
        <button
          className="room-view"
          onClick={() =>
            setView((v) => (v === "gallery" ? "speaker" : "gallery"))
          }
        >
          {view === "gallery" ? (
            <Grid2X2 size={16} />
          ) : (
            <LayoutPanelTop size={16} />
          )}
          {view === "gallery" ? "Gallery View" : "Speaker View"}
          <ChevronDown size={13} />
        </button>
      </header>
      {room.sharing && (
        <div className="sharing-banner">
          <span>
            <MonitorUp size={15} />
            You are sharing your screen
          </span>
          <button onClick={room.toggleSharing}>Stop Share</button>
        </div>
      )}
      {(room.error || room.mediaError) && (
        <div className="room-notice" role="status">
          <span>{room.error || room.mediaError}</span>
          {room.status === "disconnected" ? (
            <button onClick={() => join()}>Rejoin meeting</button>
          ) : (
            <button aria-label="Dismiss" onClick={room.clearError}>
              <X size={16} />
            </button>
          )}
        </div>
      )}
      <div className="room-content">
        <div
          className={`meeting-stage ${view === "speaker" || presenter ? "speaker-stage" : ""}`}
        >
          {view === "speaker" || presenter ? (
            <>
              <div className="filmstrip">
                {ordered.map((p) => (
                  <VideoTile
                    key={p.id}
                    participant={p}
                    stream={
                      p.id === room.selfId
                        ? room.stream
                        : room.remoteStreams[p.id]
                    }
                    self={p.id === room.selfId}
                  />
                ))}
              </div>
              <div className="spotlight-wrap">
                <VideoTile
                  participant={spotlight}
                  stream={
                    spotlight.id === room.selfId
                      ? room.shareStream || room.stream
                      : room.remoteStreams[spotlight.id]
                  }
                  self={spotlight.id === room.selfId}
                  spotlight
                />
              </div>
            </>
          ) : (
            <div className={`video-grid count-${Math.min(ordered.length, 6)}`}>
              {ordered.map((p) => (
                <VideoTile
                  key={p.id}
                  participant={p}
                  stream={
                    p.id === room.selfId
                      ? room.stream
                      : room.remoteStreams[p.id]
                  }
                  self={p.id === room.selfId}
                />
              ))}
            </div>
          )}
          {ordered.length === 1 && !presenter && (
            <div className="alone-notice">
              <Users size={20} />
              <span>You’re the only one here. Invite others to join.</span>
              <button onClick={() => setInvite(true)}>Invite</button>
            </div>
          )}
        </div>
        {panel && (
          <aside className="room-panel">
            <header>
              <h2>
                {panel === "participants"
                  ? `Participants (${ordered.length})`
                  : "Meeting Chat"}
              </h2>
              <button
                className="icon-button"
                aria-label="Close side panel"
                onClick={() => setPanel(null)}
              >
                <X size={19} />
              </button>
            </header>
            {panel === "participants" ? (
              <>
                <div className="participants-list">
                  {ordered.map((p) => (
                    <div className="participant-row" key={p.id}>
                      <span className="participant-avatar">
                        {p.display_name
                          .split(" ")
                          .map((x) => x[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <div>
                        <strong>
                          {p.display_name}
                          {p.id === room.selfId ? " (You)" : ""}
                        </strong>
                        {p.is_host && <span>Host</span>}
                      </div>
                      <span className="participant-icons">
                        {p.hand && <Hand size={16} color="#ca9100" />}
                        {p.audio ? (
                          <Mic size={16} />
                        ) : (
                          <MicOff size={16} color="#c64343" />
                        )}
                        {p.video ? (
                          <Video size={16} />
                        ) : (
                          <VideoOff size={16} color="#7b8290" />
                        )}
                      </span>
                      {self.is_host && !p.is_host && (
                        <div className="host-actions">
                          <button
                            onClick={() =>
                              room.send({ type: "mute", target: p.id })
                            }
                          >
                            Mute
                          </button>
                          <button
                            className="danger-text"
                            onClick={() =>
                              room.send({ type: "remove", target: p.id })
                            }
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <footer className="participants-footer">
                  <button
                    className="button secondary compact"
                    onClick={() => setInvite(true)}
                  >
                    <UserPlus size={15} />
                    Invite
                  </button>
                  {self.is_host && (
                    <button
                      className="button secondary compact"
                      onClick={() => room.send({ type: "mute-all" })}
                    >
                      Mute All
                    </button>
                  )}
                </footer>
              </>
            ) : (
              <>
                <div className="chat-history">
                  {room.messages.length === 0 && (
                    <div className="chat-empty">
                      <MessageSquare size={28} />
                      <p>Say hello to everyone.</p>
                      <span>
                        Messages are visible to everyone in this meeting.
                      </span>
                    </div>
                  )}
                  {room.messages.map((message) => (
                    <div
                      className={`chat-message ${message.participant_id === room.selfId ? "own" : ""}`}
                      key={message.id}
                    >
                      <div>
                        <strong>
                          {message.participant_id === room.selfId
                            ? "You"
                            : message.display_name}
                        </strong>
                        <time>
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                      <p>{message.body}</p>
                    </div>
                  ))}
                  <div ref={chatEnd} />
                </div>
                <form onSubmit={sendChat} className="chat-compose">
                  <span>
                    To: <strong>Everyone</strong>
                  </span>
                  <textarea
                    aria-label="Message everyone"
                    placeholder="Type a message…"
                    value={chat}
                    onChange={(e) => setChat(e.target.value)}
                    maxLength={2000}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendChat(e);
                      }
                    }}
                  />
                  <button
                    className="icon-button"
                    aria-label="Send message"
                    disabled={!chat.trim() || room.status !== "connected"}
                  >
                    <Send size={19} />
                  </button>
                </form>
              </>
            )}
          </aside>
        )}
      </div>
      <footer className="room-toolbar">
        <div className="toolbar-group">
          <ToolButton
            label={room.audio ? "Mute" : "Unmute"}
            icon={room.audio ? <Mic /> : <MicOff />}
            onClick={room.toggleAudio}
            warning={!room.audio}
          />
          <ToolButton
            label={room.video ? "Stop Video" : "Start Video"}
            icon={room.video ? <Video /> : <VideoOff />}
            onClick={room.toggleVideo}
            warning={!room.video}
          />
        </div>
        <div className="toolbar-group toolbar-middle">
          <ToolButton
            label={`Participants`}
            count={ordered.length}
            icon={<Users />}
            onClick={() =>
              setPanel((p) => (p === "participants" ? null : "participants"))
            }
            active={panel === "participants"}
          />
          <ToolButton
            label="Chat"
            icon={<MessageSquare />}
            onClick={() => setPanel((p) => (p === "chat" ? null : "chat"))}
            active={panel === "chat"}
            count={unread || undefined}
          />
          <ToolButton
            label={room.sharing ? "Stop Share" : "Share Screen"}
            icon={<MonitorUp />}
            onClick={room.toggleSharing}
            green
            active={room.sharing}
          />
          <ToolButton
            label={room.hand ? "Lower Hand" : "Raise Hand"}
            icon={<Hand />}
            onClick={room.toggleHand}
            active={room.hand}
          />
          <ToolButton
            label="Invite"
            icon={<UserPlus />}
            onClick={() => setInvite(true)}
          />
        </div>
        <button className="end-button" onClick={() => setLeaveDialog(true)}>
          {self.is_host ? "End" : "Leave"}
        </button>
      </footer>
      {invite && <InviteDialog meeting={meeting} onClose={closeInvite} />}
      {leaveDialog && (
        <Modal
          title={self.is_host ? "End or leave meeting?" : "Leave meeting?"}
          onClose={() => setLeaveDialog(false)}
        >
          <div className="dialog-form">
            <p>
              {self.is_host
                ? "End the meeting for everyone, or leave while others continue."
                : "You can rejoin while the meeting is still in progress."}
            </p>
            <div className="leave-actions">
              {self.is_host && (
                <button
                  className="button danger"
                  onClick={() => {
                    room.send({ type: "end" });
                    setLeaveDialog(false);
                  }}
                >
                  End Meeting for All
                </button>
              )}
              <button className="button secondary" onClick={leave}>
                Leave Meeting
              </button>
              <button
                className="text-button"
                onClick={() => setLeaveDialog(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
      {info && (
        <Modal title="Meeting information" onClose={() => setInfo(false)}>
          <div className="dialog-form">
            <h3>{meeting.title}</h3>
            <div className="detail-line">
              <Video size={17} />
              Meeting ID: {formatId(identifier)}
            </div>
            <div className="detail-line">
              <LockKeyhole size={17} />
              Host: {meeting.host_name}
            </div>
            <label>
              Invite link
              <input
                readOnly
                value={`${location.origin}${meeting.invite_path}`}
              />
            </label>
            <button
              className="button primary"
              onClick={async () => {
                try {
                  await copyText(`${location.origin}${meeting.invite_path}`);
                  setCopied(true);
                } catch {
                  /* Read-only field permits manual copying. */
                }
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function ToolButton({
  label,
  icon,
  onClick,
  active,
  warning,
  green,
  count,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  warning?: boolean;
  green?: boolean;
  count?: number;
}) {
  return (
    <button
      className={`tool-button ${active ? "active" : ""} ${warning ? "warning" : ""} ${green ? "green" : ""}`}
      onClick={onClick}
      aria-label={label}
    >
      <span>
        {icon}
        {count !== undefined && <b>{count}</b>}
      </span>
      <small>{label}</small>
    </button>
  );
}

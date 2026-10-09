"use client";
import { useEffect, useRef } from "react";
import { Hand, Mic, MicOff } from "lucide-react";
import type { Participant } from "@/lib/api";
export function VideoElement({
  stream,
  muted = false,
  mirror = false,
}: {
  stream: MediaStream | null | undefined;
  muted?: boolean;
  mirror?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream || null;
      ref.current.play().catch(() => undefined);
    }
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={mirror ? "mirrored" : ""}
    />
  );
}
export default function VideoTile({
  participant,
  stream,
  self = false,
  spotlight = false,
}: {
  participant: Participant;
  stream?: MediaStream | null;
  self?: boolean;
  spotlight?: boolean;
}) {
  const initials = participant.display_name
    .trim()
    .split(/\s+/)
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={`video-tile ${spotlight ? "spotlight" : ""} ${participant.sharing ? "screen-tile" : ""}`}
      data-testid={self ? "local-tile" : "remote-tile"}
    >
      <div
        className="tile-media"
        style={{
          visibility:
            participant.video || participant.sharing ? "visible" : "hidden",
        }}
      >
        <VideoElement
          stream={stream}
          muted={self}
          mirror={self && !participant.sharing}
        />
      </div>
      {!(participant.video || participant.sharing) && (
        <div
          className="tile-avatar"
          style={{
            background: ["#3268ab", "#7454a5", "#286f6b", "#9a6139"][
              participant.display_name.length % 4
            ],
          }}
        >
          {initials}
        </div>
      )}
      {participant.hand && (
        <span className="raised-hand">
          <Hand size={23} fill="#ffca44" color="#ffca44" />
        </span>
      )}
      <div className="tile-name">
        {participant.audio ? (
          <Mic size={13} />
        ) : (
          <MicOff size={13} color="#ff6b6b" />
        )}
        <span>
          {participant.display_name}
          {self ? " (You)" : ""}
          {participant.is_host ? " · Host" : ""}
        </span>
      </div>
    </div>
  );
}

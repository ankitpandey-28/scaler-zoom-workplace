"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ChatMessage, Participant } from "./api";

type Peer = {
  pc: RTCPeerConnection;
  makingOffer: boolean;
  ignoreOffer: boolean;
  settingAnswer: boolean;
  candidates: RTCIceCandidateInit[];
  stream: MediaStream;
};
export function useMeeting(identifier: string) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [shareStream, setShareStream] = useState<MediaStream | null>(null);
  const [audio, setAudio] = useState(true),
    [video, setVideo] = useState(true),
    [sharing, setSharing] = useState(false),
    [hand, setHand] = useState(false);
  const [mediaError, setMediaError] = useState(""),
    [error, setError] = useState("");
  const [status, setStatus] = useState<
    | "preview"
    | "connecting"
    | "connected"
    | "disconnected"
    | "ended"
    | "removed"
    | "session-expired"
  >("preview");
  const [participants, setParticipants] = useState<Participant[]>([]),
    [messages, setMessages] = useState<ChatMessage[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<
      Record<string, MediaStream>
    >({}),
    [selfId, setSelfId] = useState("");
  const socketRef = useRef<WebSocket | null>(null),
    localRef = useRef<MediaStream | null>(null),
    shareRef = useRef<MediaStream | null>(null);
  const peersRef = useRef(new Map<string, Peer>()),
    selfRef = useRef(""),
    terminalRef = useRef(false),
    connectingRef = useRef(false);
  const mediaRef = useRef({
    audio: true,
    video: true,
    sharing: false,
    hand: false,
  });
  const mountedRef = useRef(true);
  mediaRef.current = { audio, video, sharing, hand };
  const send = useCallback((value: Record<string, unknown>) => {
    if (socketRef.current?.readyState === WebSocket.OPEN)
      socketRef.current.send(JSON.stringify(value));
  }, []);
  useEffect(() => {
    send({ type: "media", audio, video, sharing, hand });
  }, [audio, video, sharing, hand, send]);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const wantAudio = params.get("audio") !== "0",
      wantVideo = params.get("video") !== "0";
    setAudio(wantAudio);
    setVideo(wantVideo);
    async function prepare() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setAudio(false);
        setVideo(false);
        setMediaError(
          "Camera and microphone require HTTPS or localhost. You can still join.",
        );
        const empty = new MediaStream();
        localRef.current = empty;
        setStream(empty);
        return;
      }
      let acquired: MediaStream;
      try {
        acquired =
          wantAudio || wantVideo
            ? await navigator.mediaDevices.getUserMedia({
                audio: wantAudio,
                video: wantVideo ? { width: 1280, height: 720 } : false,
              })
            : new MediaStream();
      } catch {
        try {
          acquired = wantAudio
            ? await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false,
              })
            : new MediaStream();
        } catch {
          acquired = new MediaStream();
        }
        if (!cancelled)
          setMediaError(
            "Camera or microphone unavailable. Check browser permissions, or join with them off.",
          );
      }
      if (cancelled) {
        acquired.getTracks().forEach((track) => track.stop());
        return;
      }
      localRef.current = acquired;
      setStream(acquired);
      setAudio(wantAudio && acquired.getAudioTracks().length > 0);
      setVideo(wantVideo && acquired.getVideoTracks().length > 0);
    }
    prepare();
    return () => {
      cancelled = true;
      mountedRef.current = false;
      terminalRef.current = true;
      socketRef.current?.close();
      peersRef.current.forEach((peer) => peer.pc.close());
      peersRef.current.clear();
      localRef.current?.getTracks().forEach((track) => track.stop());
      shareRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function toggle(kind: "audio" | "video") {
    const enabled = kind === "audio" ? audio : video;
    const tracks =
      localRef.current?.getTracks().filter((track) => track.kind === kind) ||
      [];
    try {
      if (!tracks.length && !enabled) {
        const acquired = await navigator.mediaDevices.getUserMedia({
          audio: kind === "audio",
          video: kind === "video",
        });
        const track = acquired.getTracks()[0];
        const current = localRef.current || new MediaStream();
        current.addTrack(track);
        localRef.current = current;
        setStream(new MediaStream(current.getTracks()));
        for (const peer of peersRef.current.values()) {
          const sender = peer.pc
            .getTransceivers()
            .find((item) => item.receiver.track.kind === kind)?.sender;
          if (sender && !(kind === "video" && mediaRef.current.sharing))
            await sender.replaceTrack(track);
        }
        setMediaError("");
      } else
        tracks.forEach((track) => {
          track.enabled = !enabled;
        });
      if (kind === "audio") setAudio(!enabled);
      else setVideo(!enabled);
    } catch {
      setMediaError(
        `Unable to access your ${kind === "audio" ? "microphone" : "camera"}. Check browser permissions.`,
      );
    }
  }

  const stopSharing = useCallback(async () => {
    const camera = localRef.current?.getVideoTracks()[0] || null;
    for (const peer of peersRef.current.values()) {
      const sender = peer.pc
        .getTransceivers()
        .find((item) => item.receiver.track.kind === "video")?.sender;
      if (sender) await sender.replaceTrack(camera).catch(() => undefined);
    }
    shareRef.current?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    shareRef.current = null;
    setShareStream(null);
    setSharing(false);
  }, []);

  async function toggleSharing() {
    if (sharing) {
      await stopSharing();
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const track = display.getVideoTracks()[0];
      shareRef.current = display;
      setShareStream(display);
      for (const peer of peersRef.current.values()) {
        const sender = peer.pc
          .getTransceivers()
          .find((item) => item.receiver.track.kind === "video")?.sender;
        if (sender) await sender.replaceTrack(track);
      }
      track.onended = () => {
        stopSharing();
      };
      setSharing(true);
      setError("");
    } catch (err) {
      if ((err as DOMException).name !== "NotAllowedError")
        setError(
          "Screen sharing isn’t available in this browser. Try Chrome or Edge.",
        );
    }
  }

  async function connect(displayName: string) {
    if (connectingRef.current) return;
    connectingRef.current = true;
    terminalRef.current = false;
    setError("");
    setStatus("connecting");
    peersRef.current.forEach((peer) => peer.pc.close());
    peersRef.current.clear();
    setRemoteStreams({});
    try {
      const [joined, config] = await Promise.all([
        api<{ participant_id: string }>(`/meetings/${identifier}/join`, {
          method: "POST",
          body: JSON.stringify({ display_name: displayName }),
        }),
        api<RTCConfiguration>("/rtc-config"),
      ]);
      selfRef.current = joined.participant_id;
      setSelfId(joined.participant_id);
      const socket = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/ws/${identifier}/${joined.participant_id}`,
      );
      socketRef.current = socket;
      function createPeer(id: string, initiator = false): Peer {
        const existing = peersRef.current.get(id);
        if (existing) return existing;
        const pc = new RTCPeerConnection(config);
        const peer: Peer = {
          pc,
          makingOffer: false,
          ignoreOffer: false,
          settingAnswer: false,
          candidates: [],
          stream: new MediaStream(),
        };
        peersRef.current.set(id, peer);
        pc.onicecandidate = (event) => {
          if (event.candidate)
            send({
              type: "signal",
              to: id,
              payload: { candidate: event.candidate.toJSON() },
            });
        };
        pc.ontrack = (event) => {
          // A renegotiated track replaces the previous track of that kind.
          // A fresh stream also makes React rebind the video element.
          const tracks = peer.stream
            .getTracks()
            .filter((track) => track.kind !== event.track.kind);
          peer.stream = new MediaStream([...tracks, event.track]);
          setRemoteStreams((current) => ({ ...current, [id]: peer.stream }));
        };
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "failed") {
            pc.restartIce();
            setError("A participant’s connection is unstable. Reconnecting…");
          } else if (pc.connectionState === "connected") setError("");
        };
        pc.onnegotiationneeded = async () => {
          if (!initiator && !pc.remoteDescription) return;
          try {
            peer.makingOffer = true;
            await pc.setLocalDescription();
            send({
              type: "signal",
              to: id,
              payload: { description: pc.localDescription },
            });
          } catch {
            /* A peer can leave during negotiation. */
          } finally {
            peer.makingOffer = false;
          }
        };
        const local = localRef.current || new MediaStream();
        if (initiator) {
          for (const kind of ["audio", "video"] as const) {
            const track =
              kind === "video" && shareRef.current
                ? shareRef.current.getVideoTracks()[0]
                : local.getTracks().find((item) => item.kind === kind);
            pc.addTransceiver(track || kind, {
              direction: "sendrecv",
              streams: [local],
            });
          }
        }
        return peer;
      }
      async function signal(
        id: string,
        payload: {
          description?: RTCSessionDescriptionInit;
          candidate?: RTCIceCandidateInit;
        },
      ) {
        const peer = createPeer(id),
          pc = peer.pc;
        try {
          if (payload.description) {
            const description = payload.description;
            const collision =
              description.type === "offer" &&
              (peer.makingOffer ||
                (pc.signalingState !== "stable" && !peer.settingAnswer));
            const polite = selfRef.current.localeCompare(id) > 0;
            peer.ignoreOffer = !polite && collision;
            if (peer.ignoreOffer) return;
            peer.settingAnswer = description.type === "answer";
            await pc.setRemoteDescription(description);
            peer.settingAnswer = false;
            for (const candidate of peer.candidates.splice(0))
              await pc.addIceCandidate(candidate);
            if (description.type === "offer") {
              // Reuse the offer's transceivers on the answering side. Creating
              // another pair here would produce duplicate video m-lines.
              const local = localRef.current || new MediaStream();
              for (const transceiver of pc.getTransceivers()) {
                const kind = transceiver.receiver.track.kind;
                const track =
                  kind === "video" && shareRef.current
                    ? shareRef.current.getVideoTracks()[0]
                    : local.getTracks().find((item) => item.kind === kind);
                await transceiver.sender.replaceTrack(track || null);
                transceiver.sender.setStreams(local);
                transceiver.direction = "sendrecv";
              }
              await pc.setLocalDescription();
              send({
                type: "signal",
                to: id,
                payload: { description: pc.localDescription },
              });
            }
          } else if (payload.candidate && !peer.ignoreOffer) {
            if (pc.remoteDescription)
              await pc.addIceCandidate(payload.candidate);
            else peer.candidates.push(payload.candidate);
          }
        } catch {
          if (!peer.ignoreOffer && pc.connectionState !== "closed")
            setError(
              "Connecting media… If video doesn’t appear, check your network.",
            );
        }
      }
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "welcome") {
          setStatus("connected");
          setParticipants(data.participants);
          setMessages(data.messages);
          send({ type: "media", ...mediaRef.current });
          for (const participant of data.participants as Participant[])
            if (participant.id !== joined.participant_id)
              createPeer(participant.id, true);
        } else if (data.type === "participant-joined") {
          setParticipants((current) => [
            ...current.filter((p) => p.id !== data.participant.id),
            data.participant,
          ]);
          createPeer(data.participant.id);
        } else if (data.type === "participant-updated") {
          setParticipants((current) =>
            current.map((p) =>
              p.id === data.participant.id ? data.participant : p,
            ),
          );
        } else if (data.type === "participant-left") {
          peersRef.current.get(data.id)?.pc.close();
          peersRef.current.delete(data.id);
          setParticipants((current) => current.filter((p) => p.id !== data.id));
          setRemoteStreams((current) => {
            const next = { ...current };
            delete next[data.id];
            return next;
          });
        } else if (data.type === "signal") {
          void signal(data.from, data.payload);
        } else if (data.type === "chat")
          setMessages((current) => [...current, data.message]);
        else if (data.type === "force-mute") {
          localRef.current?.getAudioTracks().forEach((track) => {
            track.enabled = false;
          });
          setAudio(false);
        } else if (data.type === "error") setError(data.message);
        else if (
          data.type === "ended" ||
          data.type === "removed" ||
          data.type === "session-expired"
        ) {
          terminalRef.current = true;
          setStatus(data.type);
          releaseMedia();
        }
      };
      socket.onclose = () => {
        connectingRef.current = false;
        peersRef.current.forEach((peer) => peer.pc.close());
        peersRef.current.clear();
        if (!terminalRef.current && mountedRef.current) {
          setStatus("disconnected");
          setError("You’ve been disconnected. Rejoin to continue the meeting.");
        }
      };
      socket.onerror = () =>
        setError(
          "Unable to connect to the meeting. Check your connection and try again.",
        );
    } catch (err) {
      connectingRef.current = false;
      setStatus("preview");
      setError((err as Error).message);
    }
  }
  function releaseMedia() {
    localRef.current?.getTracks().forEach((track) => track.stop());
    shareRef.current?.getTracks().forEach((track) => track.stop());
    peersRef.current.forEach((peer) => peer.pc.close());
    peersRef.current.clear();
  }
  function leave() {
    terminalRef.current = true;
    socketRef.current?.close();
    releaseMedia();
  }
  return {
    stream,
    shareStream,
    audio,
    video,
    sharing,
    hand,
    mediaError,
    error,
    status,
    participants,
    messages,
    remoteStreams,
    selfId,
    connect,
    leave,
    toggleAudio: () => toggle("audio"),
    toggleVideo: () => toggle("video"),
    toggleSharing,
    toggleHand: () => setHand((value) => !value),
    send,
    clearError: () => {
      setError("");
      setMediaError("");
    },
  };
}

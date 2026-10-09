export type User = { id: number; display_name: string; email: string };
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export type Meeting = {
  id: string;
  title: string;
  description: string;
  scheduled_at: string;
  duration_minutes: number;
  kind: "instant" | "scheduled";
  status: "scheduled" | "active" | "ended" | "cancelled";
  host_name: string;
  is_host: boolean;
  invite_path: string;
  participant_count?: number;
};
export type Participant = {
  id: string;
  display_name: string;
  is_host: boolean;
  audio: boolean;
  video: boolean;
  sharing: boolean;
  hand: boolean;
};
export type ChatMessage = {
  id: number;
  body: string;
  created_at: string;
  participant_id: string;
  display_name: string;
};
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail =
      typeof body.detail === "string" ? body.detail : body.detail?.[0]?.msg;
    throw new ApiError(
      detail || "Something went wrong. Please try again.",
      response.status,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export const formatId = (id: string) =>
  `${id.slice(0, 3)} ${id.slice(3, 7)} ${id.slice(7)}`;
export const timeOf = (value: string) =>
  new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
export function parseMeetingId(input: string) {
  const match = input.match(/\/meeting\/(\d{11})(?:[/?#]|$)/);
  return match?.[1] || input.replace(/[\s-]/g, "");
}
export async function copyText(value: string) {
  if (navigator.clipboard && window.isSecureContext)
    return navigator.clipboard.writeText(value);
  const field = document.createElement("textarea");
  field.value = value;
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied)
    throw new Error("Unable to copy. Please copy the invitation manually.");
}

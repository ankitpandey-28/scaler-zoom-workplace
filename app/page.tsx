import Landing from "@/components/Landing";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Zoom | One platform to connect",
  description:
    "Bring your people and ideas together. Start, join, and schedule video meetings with Zoom Workplace.",
};
export default function Page() {
  return <Landing />;
}

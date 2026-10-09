import MeetingRoom from "@/components/MeetingRoom";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MeetingRoom identifier={id} />;
}

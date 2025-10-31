// app/studyroom/[id]/page.tsx
import StudyRoomClient from "./StudyRoomClient"

export default async function StudyRoomPage({ params }: { params: Promise<{ id: string }> }) {
  // ✅ Properly unwrap the promise-based params in Next.js 15 / React 19
  const { id } = await params

  // Pass roomId down to the client component
  return <StudyRoomClient roomId={id} />
}

import CommunityClientPage from "./CommunityClientPage"

export default async function CommunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CommunityClientPage communityId={id} />
}

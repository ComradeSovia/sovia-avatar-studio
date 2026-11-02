import { Workspace } from "@/features/editor/workspace";
export default async function CharacterPage({ params }: { params: Promise<{ id: string }> }) {
  return <Workspace id={(await params).id} />;
}

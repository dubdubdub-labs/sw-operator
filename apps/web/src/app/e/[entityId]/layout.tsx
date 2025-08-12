import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@repo/ui/components/resizable";
import Chat from "@/components/chat";
import { EntityPageHeader } from "@/components/entity-page/entity-page-header";
import type { EntityPageParams } from "./params";

export default async function EntityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<EntityPageParams>;
}) {
  const { entityId: encodedEntityId } = await params;
  const entityId = decodeURIComponent(encodedEntityId);
  return (
    <>
      <EntityPageHeader entityId={entityId} />
      <ResizablePanelGroup className="h-full w-full" direction="horizontal">
        <ResizablePanel defaultSize={75}>
          <div className="h-full w-full flex-1">{children}</div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={25}>
          <Chat />
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );
}

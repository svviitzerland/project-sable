import {
  CircleAlert,
  FileText,
  FolderOpen,
  House,
  LayoutDashboard,
  MessageSquare,
  NotebookPen,
  Scale,
  Speech,
  Waypoints,
} from "@lucide/svelte";

/**
 * One icon for each kind of thing in a case, used wherever that thing appears so it is
 * recognisable from page to page: a case is a folder, a hearing a talking head, a document or
 * one of its passages a page, a finding the attention mark. A hearing statement shows the
 * talking head of the person who said it (see KindIcon); the icon here is only its fallback.
 */
export const kindIcon = {
  case: FolderOpen,
  overview: House,
  hearing: Speech,
  statement: Speech,
  document: FileText,
  passage: FileText,
  finding: CircleAlert,
  legal: Scale,
  connection: Waypoints,
  board: LayoutDashboard,
  assistant: MessageSquare,
  note: NotebookPen,
} as const;

export type Kind = keyof typeof kindIcon;

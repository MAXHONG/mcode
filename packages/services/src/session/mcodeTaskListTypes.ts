import type { WorkspacePurpose, McodeTaskMeta } from "@mcode/shared";

export type McodeTaskListKind = "pinned" | "archived" | "timeline" | "active";
export type McodeTaskListSortBy = "created" | "updated";

export interface McodeTaskListWorkspaceScope {
  workspacePath: string;
  workspaceIdentity?: string;
  workspacePurpose?: WorkspacePurpose;
}

export interface McodeTaskListQuery {
  kind: McodeTaskListKind | "all";
  /** host 由存储 owner 确定全部范围，不接受 UI 已打开工作区作为历史目录。 */
  workspaceScopes: McodeTaskListWorkspaceScope[] | "host";
  sortBy: McodeTaskListSortBy;
  search?: string;
  limit?: number;
}

export type McodeTaskListItem = McodeTaskMeta & {
  searchSnippet?: string;
  searchSnippets?: string[];
};

export interface McodeTaskListResult {
  items: McodeTaskListItem[];
  total: number;
  hasMore: boolean;
}

export interface McodeWorkspaceEventSubscriptionParams {
  workspacePath: string;
  workspaceIdentity?: string;
}

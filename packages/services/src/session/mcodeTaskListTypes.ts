import type { WorkspacePurpose, McodeTaskMeta } from "@mcode/shared";

export type McodeTaskListKind = "pinned" | "archived" | "timeline" | "active";
export type McodeTaskListSortBy = "created" | "updated";

export interface McodeTaskListWorkspaceScope {
  workspacePath: string;
  workspaceIdentity?: string;
  workspacePurpose?: WorkspacePurpose;
}

export interface McodeTaskListQuery {
  kind: McodeTaskListKind;
  workspaceScopes: McodeTaskListWorkspaceScope[];
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

export type McodeTaskGroupColor =
  | "gray"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple";

export interface McodeTaskGroup {
  id: string;
  title: string;
  color: McodeTaskGroupColor;
  createdAt: number;
  updatedAt: number;
}

export interface McodeGroupedTaskRef {
  workspacePath: string;
  workspaceIdentity?: string;
  taskId: string;
}

export type McodeGroupedTaskViewTopLevelNodeRef =
  | { type: "group"; groupId: string }
  | { type: "task"; task: McodeGroupedTaskRef };

export type McodeGroupedTaskViewNode =
  | {
      type: "group";
      group: McodeTaskGroup;
      tasks: McodeTaskListItem[];
      sortOrder?: number;
    }
  | {
      type: "task";
      task: McodeTaskListItem;
      sortOrder?: number;
    };

export interface McodeGroupedTaskView {
  nodes: McodeGroupedTaskViewNode[];
}

export interface McodeGroupedTaskViewQuery {
  workspaceScopes: McodeTaskListWorkspaceScope[];
  includeAllWorkspaces?: boolean;
}

// ── grouped 原始结构（不 join tasks 表）──
// grouped 视图的任务数据源迁到 sessions-index 后，服务端只提供分组结构
// （task_groups / task_group_members / task_group_view_node_orders），
// 由客户端与 sessions-index 会话做 join。

/** 组成员引用（不含任务 meta；task 内容由 sessions-index 提供）。 */
export interface McodeGroupedTaskViewStructureMember {
  groupId: string;
  /** 服务端口径 workspaceKey（resolveWorkspaceKey：identity ?? path），join 匹配键。 */
  workspaceKey: string;
  workspacePath: string;
  workspaceIdentity?: string;
  taskId: string;
  /** null = 尚未落 sort_order（新加入组）；客户端按 addedAt 降序补内存序。 */
  sortOrder: number | null;
  addedAt: number;
}

/** 顶层节点排序（task_group_view_node_orders，node_key 已解析为结构化引用）。 */
export type McodeGroupedTaskViewStructureTopOrder =
  | { type: "group"; groupId: string; sortOrder: number }
  | { type: "task"; workspaceKey: string; taskId: string; sortOrder: number };

export interface McodeGroupedTaskViewStructure {
  /** 已按 workspaceScopes 可见性过滤的 group（bootstrap workspace group 只在其 workspace 可见）。 */
  groups: McodeTaskGroup[];
  /** 全量组成员（含不可见 group 的成员——顶层排除规则需要全量判断）。 */
  members: McodeGroupedTaskViewStructureMember[];
  topLevelOrders: McodeGroupedTaskViewStructureTopOrder[];
}

export interface McodeGroupedTaskViewOrderInput {
  workspaceScopes: McodeTaskListWorkspaceScope[];
  topLevelNodes: McodeGroupedTaskViewTopLevelNodeRef[];
  groups: Array<{
    groupId: string;
    taskRefs: McodeGroupedTaskRef[];
  }>;
}

export interface McodeWorkspaceEventSubscriptionParams {
  workspacePath: string;
  workspaceIdentity?: string;
}

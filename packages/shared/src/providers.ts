import { z } from "zod";

/**
 * Mcode agent 提供方的单一真源。
 *
 * 类型 McodeProvider、运行时 schema mcodeProviderSchema 都从这里派生,
 * 避免各处内联 z.enum([...]) 副本随新增/删除 provider 漂移。
 * 本模块只依赖 zod(叶子),可被 validation / mcode-protocol 等无环引用。
 */
export const MCODE_PROVIDERS = ["glm"] as const;

export const mcodeProviderSchema = z.enum(MCODE_PROVIDERS);

export type McodeProvider = (typeof MCODE_PROVIDERS)[number];

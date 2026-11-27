/* eslint-disable max-lines -- 模型供应商卡片仍在迁移期集中维护多个紧耦合区块，后续拆分时再移除。 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import type {
  ProviderSettingsFormProvider,
  ProviderSettingsFormModel,
} from "@/lib/providerSettingsFormTypes.js";
import type { ModelConnectivityResult } from "@mcode/shared";
import type { ProviderApiType } from "@mcode/provider";
import {
  TID_MODEL_PROVIDER_ADD_MODEL_BUTTON,
  TID_MODEL_PROVIDER_BASE_URL_INPUT,
  TID_MODEL_PROVIDER_MODEL_DELETE_BUTTON,
  TID_MODEL_PROVIDER_MODEL_INPUT,
  TID_MODEL_PROVIDER_NAME_EDIT_BUTTON,
  TID_MODEL_PROVIDER_NAME_INPUT,
  testId,
} from "@mcode/shared/test-ids";
import {
  Check,
  InfoIcon,
  LoaderCircle,
  LockKeyholeIcon,
  Plus,
  Pencil,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import {
  FALLBACK_DISCOVERED_MODEL_CONFIG,
  type DiscoveredProviderModel,
} from "@mcode/services";
import type { ModelConfigObject } from "@mcode/provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu.js";
import { useMcodeIntl } from "@/i18n/IntlProvider.js";
import { useServices } from "@/hooks/useServices.js";
import { TECHNICAL_INPUT_ATTRIBUTES } from "@/lib/technicalInputAttributes.js";
import { ApiKeyInput } from "./ApiKeyInput.js";
import { ModelRowInput } from "./ProviderFormControls.js";
import { PresetProviderApiKeyBanner } from "./PresetProviderApiKeyBanner.js";
import { type ProviderModelDraftValues } from "@/settings/model-provider-section/ProviderModelMetadata.js";
import { ProviderModelMetadataDialog } from "@/settings/model-provider-section/ProviderModelMetadataDialog.js";
import {
  PROVIDER_CONNECTION_API_FORMATS,
  ProviderApiFormatSelect,
  resolveProviderConnectionApiFormatDisplayLabel,
} from "@/settings/model-provider-section/ProviderApiFormatSelect.js";
import { SortableProviderModelList } from "@/settings/model-provider-section/SortableProviderModelList.js";
import { useProviderModelDraft } from "@/settings/model-provider-section/useProviderModelDraft.js";
import { ProviderLogo } from "@/settings/model-provider-section/ProviderLogo.js";
import type { ProviderConfigObject } from "@mcode/provider";

export {
  resolveProviderConnectionApiFormatDisplayLabel,
  resolveProviderConnectionApiFormatOptions,
} from "@/settings/model-provider-section/ProviderApiFormatSelect.js";
export { formatModelContextWindowLabel } from "@/lib/tokenNumberFormat.js";

export function resolveProviderApiFormatOptions(
  _provider: Pick<ProviderSettingsFormProvider, "config" | "models">,
): ProviderApiType[] {
  return [...PROVIDER_CONNECTION_API_FORMATS];
}

export function shouldShowProviderApiFormat(
  _provider: Pick<ProviderSettingsFormProvider, "providerId">,
): boolean {
  return true;
}

export function ProviderCardHeader({
  providerName,
  logo,
  editingName,
  nameValue,
  nameEditable = true,
  onNameChange,
  onNameBlur,
  onNameKeyDown,
  onNameCompositionEnd,
  onNameCompositionStart,
  onStartEditName,
  onDelete,
  actionsVisible = true,
  providerToggle,
}: {
  providerName: string;
  logo?: ProviderConfigObject["logo"];
  editingName: boolean;
  nameValue: string;
  nameEditable?: boolean;
  onNameChange: (value: string) => void;
  onNameBlur: () => void;
  onNameKeyDown: (event: ReactKeyboardEvent) => void;
  onNameCompositionEnd?: () => void;
  onNameCompositionStart?: () => void;
  onStartEditName: () => void;
  onDelete?: () => void;
  actionsVisible?: boolean;
  providerToggle?: ReactNode;
}) {
  const { intl } = useMcodeIntl();
  const renameRequestedRef = useRef(false);
  const secondaryActionsVisible = actionsVisible && (nameEditable || Boolean(onDelete));

  return (
    <div className="flex items-center justify-between gap-3" data-testid="model-provider-header">
      <div className="flex min-w-0 items-center gap-2">
        <ProviderLogo logo={logo} className="size-5" />
        {editingName ? (
          <Input
            {...TECHNICAL_INPUT_ATTRIBUTES}
            autoFocus
            data-testid={TID_MODEL_PROVIDER_NAME_INPUT}
            type="text"
            size="lg"
            className="w-auto min-w-0 text-ui-lg font-semibold"
            value={nameValue}
            onChange={(event) => onNameChange(event.target.value)}
            onCompositionEnd={onNameCompositionEnd}
            onCompositionStart={onNameCompositionStart}
            onBlur={onNameBlur}
            onKeyDown={onNameKeyDown}
          />
        ) : (
          <>
            <div className="min-w-0 truncate text-ui-lg font-semibold text-foreground">
              {providerName}
            </div>
          </>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {providerToggle}
        {secondaryActionsVisible ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                data-testid="model-provider-actions-button"
                aria-label={intl.formatMessage({ id: "common.more" })}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onCloseAutoFocus={(event) => {
                // 退场动画中的菜单仍会因鼠标移动抢焦点，必须关闭后再挂载并聚焦输入框。
                if (renameRequestedRef.current) {
                  event.preventDefault();
                  renameRequestedRef.current = false;
                  onStartEditName();
                }
              }}
            >
              {nameEditable ? (
                <DropdownMenuItem
                  data-testid={TID_MODEL_PROVIDER_NAME_EDIT_BUTTON}
                  onSelect={() => {
                    renameRequestedRef.current = true;
                  }}
                >
                  <Pencil className="size-3.5" />
                  {intl.formatMessage({ id: "settings.modelProvider.renameProvider" })}
                </DropdownMenuItem>
              ) : null}
              {nameEditable && onDelete ? <DropdownMenuSeparator /> : null}
              {onDelete ? (
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                  <Trash2 className="size-3.5" />
                  {intl.formatMessage({ id: "common.delete" })}
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}

export function ProviderConnectionSection({
  provider,
  readOnly,
  apiFormat,
  baseUrlValue,
  onApiFormatChange,
  onBaseUrlChange,
  onBaseUrlBlur,
  onBaseUrlKeyDown,
  onBaseUrlCompositionStart,
  onBaseUrlCompositionEnd,
}: {
  provider: ProviderSettingsFormProvider;
  readOnly?: boolean;
  apiFormat: ProviderApiType;
  baseUrlValue: string;
  onApiFormatChange: (value: ProviderApiType) => void;
  onBaseUrlChange: (value: string) => void;
  onBaseUrlBlur: () => void;
  onBaseUrlKeyDown?: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  onBaseUrlCompositionStart?: () => void;
  onBaseUrlCompositionEnd?: () => void;
}) {
  const { intl } = useMcodeIntl();
  const showApiFormat = shouldShowProviderApiFormat(provider);
  const readOnlyBaseUrl = provider.config.api?.baseUrl ?? "";
  const resolvedApiFormat = provider.config.api?.type ?? "anthropic-messages";

  const renderReadOnlyField = (label: string, value: string) => (
    <div>
      <label className="mb-1 block text-ui-base text-foreground-subtle">{label}</label>
      <div className="flex min-h-8 items-center gap-2 rounded-lg border border-input-border bg-input px-3 py-1.5 text-ui-base text-foreground">
        <span className="min-w-0 flex-1 break-all">{value || "-"}</span>
        <span
          role="img"
          aria-label={intl.formatMessage(
            { id: "settings.modelProvider.readOnlyField" },
            { field: label },
          )}
          className="shrink-0 text-foreground-subtle"
        >
          <LockKeyholeIcon className="size-3.5" aria-hidden="true" />
        </span>
      </div>
    </div>
  );

  if (readOnly) {
    return (
      <>
        {renderReadOnlyField(
          intl.formatMessage({ id: "settings.modelProvider.baseUrl" }),
          readOnlyBaseUrl,
        )}
        {showApiFormat
          ? renderReadOnlyField(
              intl.formatMessage({ id: "settings.modelProvider.apiFormat" }),
              resolveProviderConnectionApiFormatDisplayLabel(intl, resolvedApiFormat),
            )
          : null}
      </>
    );
  }

  return (
    <>
      <div>
        <label className="mb-1 block text-ui-base text-foreground-subtle">
          {intl.formatMessage({ id: "settings.modelProvider.baseUrl" })}
        </label>
        <Input
          {...TECHNICAL_INPUT_ATTRIBUTES}
          type="text"
          size="lg"
          data-testid={TID_MODEL_PROVIDER_BASE_URL_INPUT}
          value={baseUrlValue}
          placeholder={intl.formatMessage({
            id: "settings.modelProvider.baseUrlPlaceholder",
          })}
          onChange={(event) => onBaseUrlChange(event.target.value)}
          onBlur={onBaseUrlBlur}
          onKeyDown={onBaseUrlKeyDown}
          onCompositionStart={onBaseUrlCompositionStart}
          onCompositionEnd={onBaseUrlCompositionEnd}
        />
      </div>
      {showApiFormat ? (
        <div>
          <label className="mb-1 block text-ui-base text-foreground-subtle">
            {intl.formatMessage({ id: "settings.modelProvider.apiFormat" })}
          </label>
          <ProviderApiFormatSelect value={apiFormat} onChange={onApiFormatChange} />
        </div>
      ) : null}
    </>
  );
}

export function ProviderApiKeySection({
  apiKeyValue,
  apiKeyVisible,
  readOnly,
  presetApiKeyUrl,
  onOpenPresetApiKey,
  onApiKeyChange,
  onApiKeyBlur,
  onApiKeyKeyDown,
  onApiKeyCompositionStart,
  onApiKeyCompositionEnd,
  onToggleApiKeyVisibility,
}: {
  apiKeyValue: string;
  apiKeyVisible: boolean;
  readOnly?: boolean;
  presetApiKeyUrl?: string;
  onOpenPresetApiKey?: () => void;
  onApiKeyChange: (value: string) => void;
  onApiKeyBlur: () => void;
  onApiKeyKeyDown?: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  onApiKeyCompositionStart?: () => void;
  onApiKeyCompositionEnd?: () => void;
  onToggleApiKeyVisibility: () => void;
}) {
  const { intl } = useMcodeIntl();

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label className="block text-ui-base text-foreground-subtle">
          {intl.formatMessage({ id: "settings.modelProvider.apiKey" })}
        </label>
        {presetApiKeyUrl && onOpenPresetApiKey ? (
          <PresetProviderApiKeyBanner onOpenApiKey={onOpenPresetApiKey} />
        ) : null}
      </div>
      <ApiKeyInput
        value={apiKeyValue}
        visible={apiKeyVisible}
        readOnly={readOnly}
        onChange={onApiKeyChange}
        onBlur={onApiKeyBlur}
        onKeyDown={onApiKeyKeyDown}
        onCompositionStart={onApiKeyCompositionStart}
        onCompositionEnd={onApiKeyCompositionEnd}
        onToggleVisibility={onToggleApiKeyVisibility}
      />
    </div>
  );
}

function createEmptyModel(): ProviderSettingsFormModel {
  return {
    kind: "candidate",
    modelId: "",
    builtin: false,
    personalConfig: {},
    // 空 ID 尚未解析模型配置，硬编码档位会被误认为智能推荐。
    config: {
      properties: { supportsToolCall: true },
    },
    hasPersonalConfig: false,
    executable: false,
    selectable: false,
  };
}

export function ProviderModelsSection({
  providerId,
  providerName,
  providerEnabled = true,
  providerAccess,
  providerBaseUrl,
  providerApiKey,
  providerApiType,
  models,
  onTestModel,
  onModelCommit,
  onModelEnabledChange,
  onDeleteModel,
  onAddModel,
  onReorderModelIds,
  settingsRevision = 0,
}: {
  providerId: string;
  providerName?: string;
  providerEnabled?: boolean;
  providerAccess?: ProviderConfigObject["access"];
  providerBaseUrl?: string;
  providerApiKey?: string;
  providerApiType?: ProviderApiType;
  models: ProviderSettingsFormModel[];
  onTestModel?: (model: string) => Promise<ModelConnectivityResult>;
  onModelCommit: (
    originalModelId: string,
    model: ProviderSettingsFormModel,
    basedOnRevision: number,
  ) => void | Promise<void>;
  onDeleteModel: (modelId: string) => void;
  onModelEnabledChange?: (modelId: string, enabled: boolean) => void | Promise<void>;
  onAddModel: (model: ProviderSettingsFormModel) => void | Promise<void>;
  onReorderModelIds?: (modelIds: string[]) => void;
  settingsRevision?: number;
}) {
  const { intl, locale } = useMcodeIntl();
  const isZh = locale.toLowerCase().startsWith("zh");
  const { providerSettingsService } = useServices();
  const [discoverDialogOpen, setDiscoverDialogOpen] = useState(false);
  const existingModelIds = useMemo(() => new Set(models.map((item) => item.modelId)), [models]);
  const handleAddDiscoveredModels = useCallback(
    async (discoveredModels: readonly ProviderSettingsFormModel[]) => {
      for (const model of discoveredModels) {
        await onAddModel(model);
      }
    },
    [onAddModel],
  );
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const addSavingRef = useRef(false);
  const [addCommitError, setAddCommitError] = useState<string | null>(null);
  const [addModel] = useState(createEmptyModel);
  const [addDraftErrorField, setAddDraftErrorField] = useState<
    | "id"
    | "contextWindow"
    | "maxOutputTokens"
    | "inputFormat"
    | "reasoningLevelValues"
    | "reasoningLevelMap"
    | null
  >(null);
  const resolveAddModelConfig = useCallback(
    (modelId: string) => providerSettingsService.resolveModelConfig({ providerId, modelId }),
    [providerId, providerSettingsService],
  );
  const editor = useProviderModelDraft({
    model: addModel,
    open: addDialogOpen,
    scopeKey: providerId,
    resolve: resolveAddModelConfig,
  });
  const { draft: addDraft } = editor;

  const openAddDialog = useCallback(() => {
    editor.reset(createEmptyModel());
    setAddDraftErrorField(null);
    setAddCommitError(null);
    setAddDialogOpen(true);
  }, [editor.reset]);

  const updateAddDraft = (patch: Partial<ProviderModelDraftValues>) => {
    editor.change(patch);
    setAddDraftErrorField(null);
  };

  const cancelAddDialog = () => {
    setAddDialogOpen(false);
    editor.reset(createEmptyModel());
    setAddDraftErrorField(null);
    editor.cancel();
  };

  const handleAddDialogOpenChange = useCallback(
    (open: boolean) => {
      // 保存中的关闭/再打开会让旧请求结束掉新草稿，等待本次提交完成再结束编辑。
      if (addSavingRef.current) return;
      if (!open) {
        cancelAddDialog();
        return;
      }
      setAddDialogOpen(true);
    },
    [cancelAddDialog],
  );

  const commitAddDraft = useCallback(async (): Promise<boolean> => {
    if (addSavingRef.current) return false;
    addSavingRef.current = true;
    setAddSaving(true);
    setAddCommitError(null);
    try {
      const result = await editor.commit();
      if (result.status === "invalid") {
        setAddDraftErrorField(result.field);
        return false;
      }
      // 过去只发起异步添加就关闭弹窗，失败后输入也丢了；以实际保存完成作为结束边界。
      await onAddModel(result.model);
      setAddDialogOpen(false);
      editor.reset(createEmptyModel());
      return true;
    } catch (error) {
      setAddCommitError(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      addSavingRef.current = false;
      setAddSaving(false);
    }
  }, [editor, onAddModel]);
  const addDraftErrorMessage = addDraftErrorField
    ? intl.formatMessage({
        id: `settings.modelProvider.modelMetadata.invalid.${addDraftErrorField}`,
      })
    : null;

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <span className="text-ui-base text-foreground-subtle">
          {intl.formatMessage({ id: "settings.modelProvider.models" })}
        </span>
        <div className="flex items-center gap-2">
          {providerBaseUrl?.trim() ? (
            <Button
              type="button"
              variant="secondary"
              size="default"
              className="rounded-lg"
              onClick={() => setDiscoverDialogOpen(true)}
            >
              <Sparkles data-icon="inline-start" aria-hidden="true" />
              {isZh ? "发现模型" : "Discover Models"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="default"
            className="rounded-lg"
            data-testid={TID_MODEL_PROVIDER_ADD_MODEL_BUTTON}
            onClick={openAddDialog}
          >
            <Plus data-icon="inline-start" aria-hidden="true" />
            {intl.formatMessage({ id: "settings.modelProvider.addModel" })}
          </Button>
        </div>
      </div>
      {models.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-input-border bg-input">
          <SortableProviderModelList
            modelIds={models.map((model) => model.modelId)}
            sortableModelIds={models.map((model) => model.modelId)}
            onReorder={onReorderModelIds}
            renderModel={(_modelId, index) => {
              const model = models[index]!;
              const inputFormat = model.config.properties?.inputFormat;
              const outputFormat = model.config.properties?.outputFormat;
              const completeProperties =
                model.config.properties?.contextWindow != null &&
                inputFormat?.supportsText != null &&
                inputFormat.supportsImage != null &&
                inputFormat.supportsVideo != null &&
                inputFormat.supportsAudio != null &&
                inputFormat.supportsPdf != null &&
                outputFormat?.supportsText != null;
              return (
                <>
                  <ModelRowInput
                    key={`${providerId}/${model.modelId}`}
                    providerId={providerId}
                    providerName={providerName}
                    providerEnabled={providerEnabled}
                    providerAccess={providerAccess}
                    inputTestId={testId(TID_MODEL_PROVIDER_MODEL_INPUT, String(index))}
                    deleteTestId={testId(TID_MODEL_PROVIDER_MODEL_DELETE_BUTTON, String(index))}
                    model={model}
                    onCommit={(value, basedOnRevision) =>
                      onModelCommit(model.modelId, value, basedOnRevision)
                    }
                    onResolveDraft={(nextModelId, personalConfig) =>
                      providerSettingsService.resolveModelConfig({
                        providerId,
                        originalModelId: model.modelId,
                        modelId: nextModelId,
                        personalConfig: structuredClone(personalConfig),
                      })
                    }
                    settingsRevision={settingsRevision}
                    onDelete={!model.builtin ? () => onDeleteModel(model.modelId) : undefined}
                    onEnabledChange={(enabled) => {
                      void Promise.resolve(onModelEnabledChange?.(model.modelId, enabled)).catch(
                        () => undefined,
                      );
                    }}
                    onTest={onTestModel}
                  />
                  {!completeProperties && (
                    <div className="px-3 pb-2 text-ui-sm text-destructive">
                      {model.issues?.[0]?.message ??
                        intl.formatMessage({ id: "settings.modelProvider.modelConfigIncomplete" })}
                    </div>
                  )}
                </>
              );
            }}
          />
        </div>
      ) : (
        <div className="mt-1 flex h-12 items-center justify-start gap-2 rounded-lg border border-dashed border-border px-4 text-left text-ui-base text-foreground-subtle">
          <InfoIcon className="size-4 shrink-0" aria-hidden="true" />
          {intl.formatMessage({ id: "settings.modelProvider.modelsEmpty" })}
        </div>
      )}
      <>
        <ProviderModelMetadataDialog
          onRestore={() => {
            setAddDraftErrorField(null);
            setAddCommitError(null);
            void editor
              .restore()
              .catch((error) =>
                setAddCommitError(error instanceof Error ? error.message : String(error)),
              );
          }}
          mode="add"
          open={addDialogOpen}
          draft={addDraft}
          draftErrorMessage={addCommitError ?? addDraftErrorMessage}
          draftErrorField={addDraftErrorField}
          inheritedConfig={editor.inheritedConfig}
          overrideFields={editor.overrides}
          onOpenChange={handleAddDialogOpenChange}
          onDraftChange={updateAddDraft}
          onCommit={commitAddDraft}
          saving={addSaving}
          modelConfigResolutionPending={editor.pending}
          modelDefaultsLoaded={editor.defaultsLoaded}
          onModelIdBlur={() => {
            void editor.flush().catch(() => undefined);
          }}
        />
        <DiscoverModelsDialog
          open={discoverDialogOpen}
          onOpenChange={setDiscoverDialogOpen}
          providerId={providerId}
          baseUrl={providerBaseUrl}
          apiKey={providerApiKey}
          apiType={providerApiType}
          existingModelIds={existingModelIds}
          onAddModels={handleAddDiscoveredModels}
        />
      </>
    </div>
  );
}

function formatContextBadge(contextWindow: number | null | undefined): string | null {
  if (!contextWindow || contextWindow <= 0) return null;
  if (contextWindow >= 1_000_000) {
    const m = contextWindow / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  return `${Math.round(contextWindow / 1000)}K`;
}

function buildDiscoveredFormModel(item: DiscoveredProviderModel): ProviderSettingsFormModel {
  const effectiveConfig: ModelConfigObject = item.matchedBuiltinRule
    ? { ...item.resolution.inheritedConfig, enabled: true }
    : structuredClone(FALLBACK_DISCOVERED_MODEL_CONFIG);
  return {
    ...createEmptyModel(),
    modelId: item.modelId,
    useRecommendedConfig: item.matchedBuiltinRule,
    inheritedConfig: item.resolution.inheritedConfig,
    personalConfig: item.matchedBuiltinRule
      ? {}
      : structuredClone(FALLBACK_DISCOVERED_MODEL_CONFIG),
    config: effectiveConfig,
    issues: [],
  };
}

function DiscoverModelsDialog({
  open,
  onOpenChange,
  providerId,
  baseUrl,
  apiKey,
  apiType,
  existingModelIds,
  onAddModels,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  baseUrl?: string;
  apiKey?: string;
  apiType?: ProviderApiType;
  existingModelIds: ReadonlySet<string>;
  onAddModels: (models: readonly ProviderSettingsFormModel[]) => Promise<void>;
}) {
  const { locale } = useMcodeIntl();
  const isZh = locale.toLowerCase().startsWith("zh");
  const { providerSettingsService } = useServices();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [discovered, setDiscovered] = useState<readonly DiscoveredProviderModel[]>([]);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  const runDiscover = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await providerSettingsService.discoverProviderModels({
        providerId,
        ...(baseUrl?.trim() ? { baseUrl: baseUrl.trim() } : {}),
        ...(apiKey?.trim() ? { apiKey: apiKey.trim() } : {}),
        ...(apiType ? { apiType } : {}),
      });
      setDiscovered(result.models);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDiscovered([]);
    } finally {
      setLoading(false);
    }
  }, [apiKey, apiType, baseUrl, providerId, providerSettingsService]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    void runDiscover();
  }, [open, runDiscover]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return discovered;
    return discovered.filter(
      (item) =>
        item.modelId.toLowerCase().includes(keyword) ||
        item.displayName?.toLowerCase().includes(keyword) ||
        item.ownedBy?.toLowerCase().includes(keyword),
    );
  }, [discovered, query]);

  const selectableFiltered = useMemo(
    () => filtered.filter((item) => !existingModelIds.has(item.modelId)),
    [existingModelIds, filtered],
  );

  const toggleModel = (modelId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) next.delete(modelId);
      else next.add(modelId);
      return next;
    });
  };

  const allSelectableChecked =
    selectableFiltered.length > 0 &&
    selectableFiltered.every((item) => selectedIds.has(item.modelId));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelectableChecked) {
        for (const item of selectableFiltered) next.delete(item.modelId);
      } else {
        for (const item of selectableFiltered) next.add(item.modelId);
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    const chosen = discovered.filter(
      (item) => selectedIds.has(item.modelId) && !existingModelIds.has(item.modelId),
    );
    if (chosen.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await onAddModels(chosen.map(buildDiscoveredFormModel));
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!saving ? onOpenChange(next) : undefined)}>
      <DialogContent className="flex max-h-[82vh] max-w-[580px] flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4" aria-hidden="true" />
            {isZh ? "发现模型" : "Discover Models"}
          </DialogTitle>
          <DialogDescription>
            {isZh
              ? "从当前 API 地址拉取可用模型，并自动匹配内置上下文长度、视觉、推理等参数。"
              : "Fetch available models from this endpoint and auto-match built-in context, vision, and reasoning parameters."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-foreground-subtle"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={isZh ? "搜索模型 ID..." : "Filter model IDs..."}
              className="pl-8"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={loading || saving}
            onClick={() => void runDiscover()}
          >
            <RefreshCw className={loading ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden="true" />
            {isZh ? "刷新" : "Refresh"}
          </Button>
          {selectableFiltered.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={loading || saving}
              onClick={toggleSelectAll}
            >
              {allSelectableChecked
                ? isZh
                  ? "取消全选"
                  : "Deselect all"
                : isZh
                  ? "全选"
                  : "Select all"}
            </Button>
          ) : null}
        </div>

        <div className="min-h-[220px] flex-1 overflow-y-auto rounded-lg border border-input-border bg-input">
          {loading ? (
            <div className="flex h-[220px] items-center justify-center gap-2 text-ui-sm text-foreground-subtle">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              {isZh ? "正在拉取模型列表并匹配参数..." : "Fetching models and matching parameters..."}
            </div>
          ) : error ? (
            <div className="flex h-[220px] flex-col items-center justify-center gap-2 px-6 text-center text-ui-sm text-destructive">
              <p className="break-all">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-ui-sm text-foreground-subtle">
              {discovered.length === 0
                ? isZh
                  ? "未发现可用模型，请检查 API 地址和 API Key。"
                  : "No models returned. Check your Base URL and API Key."
                : isZh
                  ? "没有匹配的模型"
                  : "No matching models"}
            </div>
          ) : (
            <div className="divide-y divide-input-border">
              {filtered.map((item) => {
                const alreadyAdded = existingModelIds.has(item.modelId);
                const checked = alreadyAdded || selectedIds.has(item.modelId);
                const props = item.resolution.inheritedConfig.properties;
                const ctxBadge = formatContextBadge(props?.contextWindow);
                const hasVision = Boolean(props?.inputFormat?.supportsImage);
                const hasReasoning =
                  (item.resolution.inheritedConfig.optionSpecs?.reasoningLevel?.values?.length ?? 0) >
                  0;
                return (
                  <button
                    key={item.modelId}
                    type="button"
                    disabled={alreadyAdded || saving}
                    onClick={() => toggleModel(item.modelId)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-hover disabled:cursor-default disabled:opacity-60"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input-border bg-background"
                        }`}
                      >
                        {checked ? <Check className="size-3" aria-hidden="true" /> : null}
                      </span>
                      <span className="truncate font-mono text-ui-sm text-foreground">
                        {item.modelId}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 text-ui-xs">
                      {alreadyAdded ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-foreground-subtle">
                          {isZh ? "已添加" : "Added"}
                        </span>
                      ) : null}
                      {item.matchedBuiltinRule ? (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                          {isZh ? "已匹配参数" : "Matched"}
                        </span>
                      ) : null}
                      {ctxBadge ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-foreground-subtle">
                          {ctxBadge}
                        </span>
                      ) : null}
                      {hasVision ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-foreground-subtle">
                          {isZh ? "视觉" : "Vision"}
                        </span>
                      ) : null}
                      {hasReasoning ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-foreground-subtle">
                          {isZh ? "推理" : "Reasoning"}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            {isZh ? "取消" : "Cancel"}
          </Button>
          <Button
            type="button"
            disabled={loading || saving || selectedIds.size === 0}
            onClick={() => void handleConfirm()}
          >
            {saving ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : null}
            {isZh
              ? `添加所选模型 (${selectedIds.size})`
              : `Add Selected (${selectedIds.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

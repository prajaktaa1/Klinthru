"use client";

import { useEffect, useMemo, useState } from "react";

import { BasicDropdown, PipeGradeDropdown, PipeMaterialDropdown } from "@/components/pipe-material-dropdown";
import { createPipeline, fetchPipelineById, fetchPipelines, updatePipeline } from "@/lib/apiClient";
import { DiameterUnit, PipelineInput, PipelineRecord, PressureUnit, WallThicknessUnit } from "@/lib/types";

const emptyPipelineInput: PipelineInput = {
  pipelineCode: "",
  pipelineName: "",
  location: "",
  serviceOrProduct: "",
  pipeLocationId: "",
  pipeMaterial: "",
  pipeMaterialOther: "",
  pipeGrade: "",
  pipeGradeOther: "",
  diameterUnit: "mm",
  operatingPressureUnit: "bar",
  wallThicknessUnit: "mm",
  status: "Active"
};

const numberFields: Array<keyof PipelineInput> = [
  "pipeAgeYears",
  "pipeLengthKm",
  "pipeInsideDiameter",
  "pipeOutsideDiameter",
  "smysMpa",
  "maopBar",
  "nominalWallThickness",
  "wallThicknessInputValue",
  "designPressure",
  "operatingPressure",
  "operatingPressureInputValue",
  "installationYear",
  "inspectionYear",
  "designLife"
];

const pressureUnitOptions: PressureUnit[] = ["bar", "MPa", "kPa", "psi"];
const wallThicknessUnitOptions: WallThicknessUnit[] = ["mm", "in"];
const pipelineStatusOptions = ["Active", "Inactive"] as const;

function isReasonableYear(value: number | undefined) {
  return value === undefined || (Number.isInteger(value) && value >= 1900 && value <= 2100);
}

function pressureToBar(value: number, unit: PressureUnit) {
  if (unit === "MPa") {
    return value * 10;
  }

  if (unit === "kPa") {
    return value * 0.01;
  }

  if (unit === "psi") {
    return value * 0.0689476;
  }

  return value;
}

function pressureFromBar(value: number, unit: PressureUnit) {
  if (unit === "MPa") {
    return value / 10;
  }

  if (unit === "kPa") {
    return value / 0.01;
  }

  if (unit === "psi") {
    return value / 0.0689476;
  }

  return value;
}

function roundPressure(value: number) {
  return Number(value.toFixed(6));
}

function wallThicknessToMm(value: number, unit: WallThicknessUnit) {
  return unit === "in" ? value * 25.4 : value;
}

function wallThicknessFromMm(value: number, unit: WallThicknessUnit) {
  return unit === "in" ? value / 25.4 : value;
}

function roundWallThickness(value: number) {
  return Number(value.toFixed(6));
}

export function PipelineSelector({
  selectedPipeline,
  onSelect,
  onClear,
  onPopulate,
  canClear = true,
  mode = "manage",
  editRequestKey,
  createRequestKey,
  discardEditRequestKey,
  onDirtyChange,
  hidePicker = false
}: {
  selectedPipeline: PipelineRecord | null;
  onSelect: (pipeline: PipelineRecord) => boolean | void;
  onClear?: () => void;
  onPopulate?: (pipeline: PipelineRecord) => void;
  canClear?: boolean;
  mode?: "manage" | "select-only";
  editRequestKey?: string | number | null;
  createRequestKey?: string | number | null;
  discardEditRequestKey?: string | number | null;
  onDirtyChange?: (isDirty: boolean) => void;
  hidePicker?: boolean;
}) {
  const [pipelines, setPipelines] = useState<PipelineRecord[]>([]);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PipelineInput>(emptyPipelineInput);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [pendingPipelineId, setPendingPipelineId] = useState(selectedPipeline?.id ?? "");
  const [isLoadingSelectedPipeline, setIsLoadingSelectedPipeline] = useState(false);
  const [editBaseline, setEditBaseline] = useState<PipelineInput>(emptyPipelineInput);

  async function loadPipelines(query = search) {
    setIsLoading(true);
    try {
      const records = await fetchPipelines(query);
      setPipelines(records);
    } catch {
      setNotice("Pipelines could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPipelines("");
  }, []);

  useEffect(() => {
    setPendingPipelineId(selectedPipeline?.id ?? "");
  }, [selectedPipeline?.id]);

  const filteredPipelines = useMemo(() => pipelines, [pipelines]);
  const isSelectOnly = mode === "select-only";

  function openCreate() {
    setEditingId(null);
    setForm(emptyPipelineInput);
    setEditBaseline(emptyPipelineInput);
    setIsEditing(true);
    setNotice(null);
  }

  function openEditFor(pipeline: PipelineRecord | null) {
    if (!pipeline) {
      return;
    }

    const nextForm = {
      pipelineCode: pipeline.pipelineCode,
      pipelineName: pipeline.pipelineName,
      location: pipeline.location ?? "",
      serviceOrProduct: pipeline.serviceOrProduct ?? "",
      pipeLocationId: pipeline.pipeLocationId ?? pipeline.location ?? "",
      pipeMaterial: pipeline.pipeMaterial ?? "",
      pipeMaterialOther: pipeline.pipeMaterialOther ?? "",
      pipeGrade: pipeline.pipeGrade ?? "",
      pipeGradeOther: pipeline.pipeGradeOther ?? "",
      pipeAgeYears: pipeline.pipeAgeYears,
      pipeLengthKm: pipeline.pipeLengthKm,
      pipeInsideDiameter: pipeline.pipeInsideDiameter,
      pipeOutsideDiameter: pipeline.pipeOutsideDiameter,
      diameterUnit: pipeline.diameterUnit ?? "mm",
      smysMpa: pipeline.smysMpa,
      maopBar: pipeline.maopBar,
      nominalWallThickness: pipeline.nominalWallThickness,
      wallThicknessInputValue:
        pipeline.wallThicknessInputValue ?? pipeline.nominalWallThickness,
      wallThicknessUnit: pipeline.wallThicknessUnit ?? "mm",
      designPressure: pipeline.designPressure,
      operatingPressure: pipeline.operatingPressure,
      operatingPressureInputValue:
        pipeline.operatingPressureInputValue ?? pipeline.operatingPressure,
      operatingPressureUnit: pipeline.operatingPressureUnit ?? "bar",
      installationYear: pipeline.installationYear,
      inspectionYear: pipeline.inspectionYear,
      installationDate: pipeline.installationDate?.slice(0, 10) ?? "",
      designLife: pipeline.designLife,
      status: pipeline.status
    };
    setEditingId(pipeline.id);
    setForm(nextForm);
    setEditBaseline(nextForm);
    setIsEditing(true);
  }

  function openEdit() {
    openEditFor(selectedPipeline);
  }

  useEffect(() => {
    if (isSelectOnly || !editRequestKey || !selectedPipeline) {
      return;
    }

    openEditFor(selectedPipeline);
  }, [editRequestKey]);

  useEffect(() => {
    if (isSelectOnly || !createRequestKey) {
      return;
    }

    openCreate();
  }, [createRequestKey]);

  useEffect(() => {
    if (isSelectOnly || !discardEditRequestKey) {
      return;
    }

    setIsEditing(false);
    setFieldErrors({});
    setForm(editBaseline);
    onDirtyChange?.(false);
  }, [discardEditRequestKey]);

  useEffect(() => {
    onDirtyChange?.(isEditing && JSON.stringify(form) !== JSON.stringify(editBaseline));
  }, [editBaseline, form, isEditing, onDirtyChange]);

  function updateField(name: keyof PipelineInput, value: string) {
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
    setForm((current) => ({
      ...current,
      ...(name === "pipeMaterial" ? { pipeGrade: "", pipeGradeOther: "" } : {}),
      [name]: numberFields.includes(name)
        ? value.trim()
          ? Number(value)
          : undefined
        : value
    }));
  }

  function updateOperatingPressureUnit(nextUnit: PressureUnit) {
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.operatingPressure;
      delete next.operatingPressureInputValue;
      return next;
    });
    setForm((current) => {
      const currentUnit = current.operatingPressureUnit ?? "bar";
      const currentValue = current.operatingPressureInputValue ?? current.operatingPressure;
      if (typeof currentValue !== "number" || !Number.isFinite(currentValue)) {
        return {
          ...current,
          operatingPressureUnit: nextUnit
        };
      }

      const valueInBar = pressureToBar(currentValue, currentUnit);
      const nextValue = roundPressure(pressureFromBar(valueInBar, nextUnit));

      return {
        ...current,
        operatingPressure: valueInBar,
        operatingPressureInputValue: nextValue,
        operatingPressureUnit: nextUnit
      };
    });
  }

  function updateWallThicknessUnit(nextUnit: WallThicknessUnit) {
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.nominalWallThickness;
      delete next.wallThicknessInputValue;
      return next;
    });
    setForm((current) => {
      const currentUnit = current.wallThicknessUnit ?? "mm";
      const currentValue = current.wallThicknessInputValue ?? current.nominalWallThickness;
      if (typeof currentValue !== "number" || !Number.isFinite(currentValue)) {
        return {
          ...current,
          wallThicknessUnit: nextUnit
        };
      }

      const valueInMm = wallThicknessToMm(currentValue, currentUnit);
      const nextValue = roundWallThickness(wallThicknessFromMm(valueInMm, nextUnit));

      return {
        ...current,
        nominalWallThickness: valueInMm,
        wallThicknessInputValue: nextValue,
        wallThicknessUnit: nextUnit
      };
    });
  }

  function validatePipelineForm() {
    const errors: Record<string, string> = {};

    if (!form.pipelineCode.trim()) {
      errors.pipelineCode = "Pipeline Code is required.";
    }

    if (!form.pipelineName.trim()) {
      errors.pipelineName = "Pipeline Name is required.";
    }

    if (!String(form.pipeMaterial ?? "").trim()) {
      errors.pipeMaterial = "Pipe Material is required.";
    }

    if (!String(form.pipeGrade ?? "").trim()) {
      errors.pipeGrade = "Select a Pipe Grade.";
    }

    for (const field of numberFields) {
      const value = form[field];
      if (typeof value === "number" && (!Number.isFinite(value) || value < 0)) {
        errors[field] = "Value must be a finite, non-negative number.";
      }
    }

    const wallThicknessInputValue = form.wallThicknessInputValue ?? form.nominalWallThickness;
    if (
      typeof wallThicknessInputValue === "number" &&
      (!Number.isFinite(wallThicknessInputValue) || wallThicknessInputValue <= 0)
    ) {
      errors.nominalWallThickness = "Wall Thickness must be a positive number.";
    }

    if (!isReasonableYear(form.installationYear)) {
      errors.installationYear = "Enter a reasonable four-digit year.";
    }

    if (!isReasonableYear(form.inspectionYear)) {
      errors.inspectionYear = "Enter a reasonable four-digit year.";
    }

    const operatingPressureInputValue = form.operatingPressureInputValue ?? form.operatingPressure;
    const operatingPressureBar =
      typeof operatingPressureInputValue === "number"
        ? pressureToBar(operatingPressureInputValue, form.operatingPressureUnit ?? "bar")
        : undefined;

    if (typeof form.maopBar === "number" && typeof operatingPressureBar === "number" && operatingPressureBar > form.maopBar) {
      errors.operatingPressure = "Operating Pressure cannot exceed MAOP.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function savePipeline() {
    if (isSaving || !validatePipelineForm()) {
      return;
    }

    setNotice(null);
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        pipelineCode: form.pipelineCode.trim(),
        pipelineName: form.pipelineName.trim(),
        location: form.pipeLocationId?.trim() || "",
        diameterUnit: "mm" as DiameterUnit,
        nominalWallThickness: typeof form.wallThicknessInputValue === "number"
          ? wallThicknessToMm(form.wallThicknessInputValue, form.wallThicknessUnit ?? "mm")
          : form.nominalWallThickness,
        wallThicknessInputValue: form.wallThicknessInputValue ?? form.nominalWallThickness,
        wallThicknessUnit: form.wallThicknessUnit ?? "mm",
        operatingPressure: typeof form.operatingPressureInputValue === "number"
          ? pressureToBar(form.operatingPressureInputValue, form.operatingPressureUnit ?? "bar")
          : form.operatingPressure,
        status: form.status?.trim() || "Active"
      };
      const saved = editingId ? await updatePipeline(editingId, payload) : await createPipeline(payload);
      onSelect(saved);
      onPopulate?.(saved);
      setEditBaseline(payload);
      setIsEditing(false);
      onDirtyChange?.(false);
      await loadPipelines("");
      setNotice(editingId ? "Pipeline master data updated." : "Pipeline master data created.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Pipeline could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function loadSelectedPipeline() {
    if (!pendingPipelineId || isLoadingSelectedPipeline) {
      return;
    }

    setNotice(null);
    setIsLoadingSelectedPipeline(true);
    try {
      const pipeline = await fetchPipelineById(pendingPipelineId);
      const accepted = onSelect(pipeline);
      if (accepted === false) {
        setPendingPipelineId(selectedPipeline?.id ?? "");
        return;
      }
      onPopulate?.(pipeline);
      setNotice("Pipeline History data loaded.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Pipeline data could not be loaded.");
    } finally {
      setIsLoadingSelectedPipeline(false);
    }
  }

  if (isSelectOnly) {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-slate-700">Pipeline</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              onChange={(event) => setPendingPipelineId(event.target.value)}
              value={pendingPipelineId}
            >
              <option value="">{isLoading ? "Loading pipelines..." : "Select a pipeline"}</option>
              {filteredPipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.pipelineName} {"\u2014"} {pipeline.pipelineCode}
                </option>
              ))}
            </select>
          </label>
          <button
            aria-busy={isLoadingSelectedPipeline}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slateblue-700 disabled:cursor-not-allowed disabled:opacity-55"
            disabled={!pendingPipelineId || isLoadingSelectedPipeline}
            onClick={() => void loadSelectedPipeline()}
            type="button"
          >
            {isLoadingSelectedPipeline ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Loading...
              </>
            ) : (
              "Load Pipe Data"
            )}
          </button>
        </div>
        {!selectedPipeline ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
            Choose a Pipeline History record, then load its saved Pipe Data.
          </p>
        ) : null}
        {notice ? <p className="text-sm font-medium text-slate-600">{notice}</p> : null}
      </div>
    );
  }

  return (
    <div className={hidePicker ? "mt-5" : isSelectOnly ? "" : "mb-6 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"}>
      {!isSelectOnly && !hidePicker ? (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <label className="block flex-1">
            <span className="mb-2 block text-xs font-medium text-slate-700">Select Pipeline</span>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search saved pipelines"
                type="text"
                value={search}
              />
              <button
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
                onClick={() => void loadPipelines()}
                type="button"
              >
                Search
              </button>
            </div>
          </label>
          <div className="flex flex-wrap gap-3">
            <button className="rounded-full bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white" onClick={openCreate} type="button">
              Create New Pipeline
            </button>
            <button
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
              disabled={!selectedPipeline}
              onClick={openEdit}
              type="button"
            >
              Edit Pipeline
            </button>
            {onClear ? (
              <button
                className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
                disabled={!selectedPipeline || !canClear}
                onClick={onClear}
                type="button"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      ) : !hidePicker ? (
        <label className="block">
          <span className="mb-2 block text-xs font-medium text-slate-700">Pipeline</span>
        </label>
      ) : null}

      {!hidePicker ? (
      <div className={isSelectOnly ? "" : "mt-4"}>
        <select
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
          onChange={(event) => {
            const pipeline = pipelines.find((candidate) => candidate.id === event.target.value) ?? null;
            if (pipeline) {
              onSelect(pipeline);
              onPopulate?.(pipeline);
            }
          }}
          value={selectedPipeline?.id ?? ""}
        >
          <option value="">{isLoading ? "Loading pipelines..." : "Select saved pipeline"}</option>
          {filteredPipelines.map((pipeline) => (
            <option key={pipeline.id} value={pipeline.id}>
              {pipeline.pipelineName} — {pipeline.pipelineCode}
            </option>
          ))}
        </select>
      </div>
      ) : null}

      {selectedPipeline && !hidePicker ? (
        <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
          <span><strong className="text-slate-800">Code:</strong> {selectedPipeline.pipelineCode}</span>
          <span><strong className="text-slate-800">Name:</strong> {selectedPipeline.pipelineName}</span>
          <span><strong className="text-slate-800">Status:</strong> {selectedPipeline.status}</span>
        </div>
      ) : null}

      {!isSelectOnly && isEditing ? (
        <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 md:grid-cols-2">
          <PipelineField
            error={fieldErrors.pipelineCode}
            helperText="Use the unique code shown in Pipeline History and assessment dropdowns."
            label="Pipeline Code"
            onChange={(value) => updateField("pipelineCode", value)}
            required
            value={form.pipelineCode}
          />
          <PipelineField
            error={fieldErrors.pipelineName}
            helperText="Use a clear line or segment name for the report cover page."
            label="Pipeline Name"
            onChange={(value) => updateField("pipelineName", value)}
            required
            value={form.pipelineName}
          />
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-slate-700">Pipeline Status</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              onChange={(event) => updateField("status", event.target.value)}
              required
              value={form.status || "Active"}
            >
              {pipelineStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <PipelineField
            error={fieldErrors.pipeLocationId}
            helperText="Optional asset, route, or location identifier from the source record."
            label="Pipe Location/ID"
            onChange={(value) => updateField("pipeLocationId", value)}
            value={form.pipeLocationId ?? ""}
          />
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-slate-700">Pipe Material</span>
            <PipeMaterialDropdown value={form.pipeMaterial ?? ""} onChange={(value) => updateField("pipeMaterial", value)} />
            {fieldErrors.pipeMaterial ? <p className="mt-2 text-xs font-medium leading-5 text-red-600">{fieldErrors.pipeMaterial}</p> : null}
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-slate-700">Pipe Grade</span>
            <PipeGradeDropdown
              material={form.pipeMaterial ?? ""}
              value={form.pipeGrade ?? ""}
              onChange={(value) => updateField("pipeGrade", value)}
            />
            {fieldErrors.pipeGrade ? <p className="mt-2 text-xs font-medium leading-5 text-red-600">{fieldErrors.pipeGrade}</p> : null}
          </label>
          <PipelineField error={fieldErrors.pipeAgeYears} label="Pipe Age" type="number" unit="years" value={form.pipeAgeYears ?? ""} onChange={(value) => updateField("pipeAgeYears", value)} />
          <PipelineField error={fieldErrors.pipeLengthKm} label="Pipe Length" type="number" unit="km" value={form.pipeLengthKm ?? ""} onChange={(value) => updateField("pipeLengthKm", value)} />
          <PipelineField error={fieldErrors.pipeOutsideDiameter} label="Pipeline Outside Diameter (OD)" type="number" unit="mm" value={form.pipeOutsideDiameter ?? ""} onChange={(value) => updateField("pipeOutsideDiameter", value)} />
          <PipelineField error={fieldErrors.smysMpa} label="SMYS" type="number" unit="MPa" value={form.smysMpa ?? ""} onChange={(value) => updateField("smysMpa", value)} />
          <PipelineField error={fieldErrors.maopBar} label="MAOP" type="number" unit="bar" value={form.maopBar ?? ""} onChange={(value) => updateField("maopBar", value)} />
          <PressureField
            error={fieldErrors.operatingPressure ?? fieldErrors.operatingPressureInputValue}
            label="Operating Pressure"
            onChange={(value) => updateField("operatingPressureInputValue", value)}
            onUnitChange={updateOperatingPressureUnit}
            unit={form.operatingPressureUnit ?? "bar"}
            value={form.operatingPressureInputValue ?? form.operatingPressure ?? ""}
          />
          <PipelineField error={fieldErrors.installationYear} label="Installation Year" type="number" value={form.installationYear ?? ""} onChange={(value) => updateField("installationYear", value)} />
          <PipelineField error={fieldErrors.inspectionYear} label="Inspection Year" type="number" value={form.inspectionYear ?? ""} onChange={(value) => updateField("inspectionYear", value)} />
          <WallThicknessField
            error={fieldErrors.nominalWallThickness ?? fieldErrors.wallThicknessInputValue}
            label="Wall Thickness"
            onChange={(value) => updateField("wallThicknessInputValue", value)}
            onUnitChange={updateWallThicknessUnit}
            unit={form.wallThicknessUnit ?? "mm"}
            value={form.wallThicknessInputValue ?? form.nominalWallThickness ?? ""}
          />
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <button
              className="rounded-full bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              disabled={isSaving}
              onClick={() => void savePipeline()}
              type="button"
            >
              {isSaving ? "Saving..." : "Save Pipeline"}
            </button>
            <button
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
              onClick={() => {
                setForm(editBaseline);
                setFieldErrors({});
                setIsEditing(false);
                onDirtyChange?.(false);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {notice ? <p className="mt-4 text-sm text-slate-600">{notice}</p> : null}
    </div>
  );
}

function WallThicknessField({
  label,
  value,
  unit,
  onChange,
  onUnitChange,
  error
}: {
  label: string;
  value: string | number;
  unit: WallThicknessUnit;
  onChange: (value: string) => void;
  onUnitChange: (unit: WallThicknessUnit) => void;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-slate-700">{label}</span>
      <div className="relative z-10 flex w-full items-stretch overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm transition focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-100">
        <input
          className="w-full flex-1 rounded-l-2xl border-0 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
          min="0"
          onChange={(event) => onChange(event.target.value)}
          step="0.001"
          type="number"
          value={value}
        />
        <div className="relative flex w-[96px] shrink-0 items-stretch border-l border-slate-200 bg-white">
          <BasicDropdown
            value={unit}
            onChange={(nextValue) => onUnitChange(nextValue as WallThicknessUnit)}
            options={wallThicknessUnitOptions.map((option) => ({
              label: option === "mm" ? "mm — Millimetres" : "in — Inches",
              value: option
            }))}
            placeholder="Unit"
            withinField
          />
        </div>
      </div>
      {error ? <p className="mt-2 text-xs font-medium leading-5 text-red-600">{error}</p> : null}
    </label>
  );
}

function PressureField({
  label,
  value,
  unit,
  onChange,
  onUnitChange,
  error
}: {
  label: string;
  value: string | number;
  unit: PressureUnit;
  onChange: (value: string) => void;
  onUnitChange: (unit: PressureUnit) => void;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <div className="relative z-10 flex w-full items-stretch overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm transition focus-within:border-cyan-500 focus-within:ring-4 focus-within:ring-cyan-100">
        <input
          className="w-full flex-1 rounded-l-2xl border-0 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
          min="0"
          onChange={(event) => onChange(event.target.value)}
          type="number"
          value={value}
        />
        <div className="relative flex w-[96px] shrink-0 items-stretch border-l border-slate-200 bg-white">
          <BasicDropdown
            value={unit}
            onChange={(nextValue) => onUnitChange(nextValue as PressureUnit)}
            options={pressureUnitOptions.map((option) => ({ label: option, value: option }))}
            placeholder="Unit"
            withinField
          />
        </div>
      </div>
      {error ? <p className="mt-2 text-xs font-medium leading-5 text-red-600">{error}</p> : null}
    </label>
  );
}

function PipelineField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  helperText,
  unit,
  error
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  helperText?: string;
  unit?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="block text-xs font-medium text-slate-700">{label}</span>
        {unit ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {unit}
          </span>
        ) : null}
      </div>
      <div className="relative">
        <input
          className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 ${unit ? "pr-16" : ""}`}
          min={type === "number" ? "0" : undefined}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          type={type}
          value={value}
        />
        {unit ? (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-semibold text-slate-400">
            {unit}
          </span>
        ) : null}
      </div>
      {helperText ? <p className="mt-2 text-xs leading-5 text-slate-500">{helperText}</p> : null}
      {error ? <p className="mt-2 text-xs font-medium leading-5 text-red-600">{error}</p> : null}
    </label>
  );
}

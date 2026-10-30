"use client";

import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState
} from "react";

import {
  ExternalCoatingDropdown,
  InternalCoatingDropdown
} from "@/components/pipe-coating-dropdown";
import {
  BasicDropdown,
  PipeGradeDropdown,
  PipeMaterialDropdown,
  UNSUPPORTED_PIPE_MATERIALS
} from "@/components/pipe-material-dropdown";
import { PipelineSelector } from "@/components/pipeline-selector";
import { Panel } from "@/components/ui";
import {
  ApiError,
  createAssessment as createAssessmentRecord,
  createReport as createReportRecord,
  fetchPipelineById,
  isBackendUnavailableError,
  isUnauthorizedError,
  updatePipeline
} from "@/lib/apiClient";
import { getRiskBadgeClasses } from "@/lib/riskScoring";
import { getSanitizedErrorName, logSaveDiagnostic } from "@/lib/saveDiagnostics";
import { AssessmentKind, DiameterUnit, PipelineInput, PipelineRecord, PressureUnit, RiskLevel, StoredAssessment, TemperatureUnit, WallThicknessUnit } from "@/lib/types";
import { getPipeMaterialOption } from "@/lib/pipe-material-options";
import { restoreAssessmentDisplayInput } from "@/lib/externalCorrosionCalculations";

type FieldOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

type Field = {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "date";
  section: string;
  placeholder?: string;
  step?: string;
  unit?: string;
  helperText?: string;
  fullWidth?: boolean;
  options?: FieldOption[];
  unitFieldName?: string;
  unitOptions?: readonly string[];
  readOnly?: boolean;
};

type ResultMetric = {
  label: string;
  value: string | number;
};

type FormSection = {
  title: string;
  description: string;
};

type UnitMenuPosition = {
  left: number;
  top: number;
  width: number;
};

type LoadedAssessment<TInput extends Record<string, string | number | undefined>, TResult> = {
  assessmentId?: string;
  recordId?: string | null;
  inspectionDate?: string;
  input: TInput;
  result?: TResult | null;
};

type PipeDataSaveResult = {
  recordId: string;
  message: string;
};

const DIAMETER_UNIT_TO_MM: Record<DiameterUnit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  inch: 25.4,
  ft: 304.8
};

const PRESSURE_UNIT_TO_BAR: Record<PressureUnit, number> = {
  bar: 1,
  MPa: 10,
  kPa: 0.01,
  psi: 0.0689476
};

const WALL_THICKNESS_UNIT_TO_MM: Record<WallThicknessUnit, number> = {
  mm: 1,
  in: 25.4
};

function isPressureUnit(value: unknown): value is PressureUnit {
  return value === "bar" || value === "MPa" || value === "kPa" || value === "psi";
}

function isWallThicknessUnit(value: unknown): value is WallThicknessUnit {
  return value === "mm" || value === "in";
}

function isTemperatureUnit(value: unknown): value is TemperatureUnit {
  return value === "C" || value === "F" || value === "K";
}

function pressureToBar(value: number, unit: PressureUnit) {
  return value * PRESSURE_UNIT_TO_BAR[unit];
}

function pressureFromBar(value: number, unit: PressureUnit) {
  return value / PRESSURE_UNIT_TO_BAR[unit];
}

function roundPressure(value: number) {
  return Number(value.toFixed(6));
}

function wallThicknessToMm(value: number, unit: WallThicknessUnit) {
  return value * WALL_THICKNESS_UNIT_TO_MM[unit];
}

function wallThicknessFromMm(value: number, unit: WallThicknessUnit) {
  return value / WALL_THICKNESS_UNIT_TO_MM[unit];
}

function roundWallThickness(value: number) {
  return Number(value.toFixed(6));
}

function temperatureToCelsius(value: number, unit: TemperatureUnit) {
  if (unit === "F") {
    return ((value - 32) * 5) / 9;
  }

  if (unit === "K") {
    return value - 273.15;
  }

  return value;
}

function temperatureFromCelsius(value: number, unit: TemperatureUnit) {
  if (unit === "F") {
    return value * 9 / 5 + 32;
  }

  if (unit === "K") {
    return value + 273.15;
  }

  return value;
}

function roundTemperature(value: number) {
  return Number(value.toFixed(6));
}

function isReasonableYear(value: unknown) {
  if (value === undefined || value === "" || value === null) {
    return true;
  }

  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue >= 1900 && numericValue <= 2100;
}

function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateInputValue(value: string | undefined) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function isValidDateInputValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function getTemperatureMetadata(name: string) {
  if (name === "soilTemperature" || name === "soilTemperatureUnit") {
    return {
      valueField: "soilTemperature",
      inputValueField: "soilTemperatureInputValue",
      unitField: "soilTemperatureUnit"
    };
  }

  if (name === "temperature" || name === "temperatureUnit") {
    return {
      valueField: "temperature",
      inputValueField: "temperatureInputValue",
      unitField: "temperatureUnit"
    };
  }

  return null;
}

function formatUnitOptionLabel(unitFieldName: string, option: string) {
  if (unitFieldName === "wallThicknessUnit") {
    return option === "mm" ? "mm — Millimetres" : "in — Inches";
  }

  if (unitFieldName === "soilTemperatureUnit" || unitFieldName === "temperatureUnit") {
    if (option === "F") {
      return "°F — Fahrenheit";
    }

    if (option === "K") {
      return "K — Kelvin";
    }

    return "°C — Celsius";
  }

  return option;
}

function isNoGroundwaterValue(value: string) {
  return value === "No" || value === "No Groundwater";
}

function hasGroundwaterValue(value: string) {
  return !isNoGroundwaterValue(value) && value.length > 0;
}

function isGroundwaterConditionDisabled(fieldName: string, groundwaterPresence: string) {
  return fieldName === "groundwaterCondition" && isNoGroundwaterValue(groundwaterPresence);
}

function DiameterUnitDropdown({
  value,
  options,
  onChange,
  onFocusChange
}: {
  value: string;
  options: readonly DiameterUnit[];
  onChange: (value: string) => void;
  onFocusChange: (isFocused: boolean) => void;
}) {
  const listboxId = useId();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(Math.max(0, options.indexOf(value as DiameterUnit)));
  const [menuPosition, setMenuPosition] = useState<UnitMenuPosition | null>(null);

  function updateMenuPosition() {
    const button = buttonRef.current;

    if (!button) {
      return;
    }

    const rect = button.getBoundingClientRect();
    const viewportPadding = 12;

    setMenuPosition({
      left: Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - rect.width - viewportPadding)),
      top: rect.bottom + 8,
      width: rect.width
    });
  }

  function closeDropdown({ restoreFocus = false }: { restoreFocus?: boolean } = {}) {
    setIsOpen(false);
    onFocusChange(false);

    if (restoreFocus) {
      window.requestAnimationFrame(() => buttonRef.current?.focus());
    }
  }

  function openDropdown() {
    setActiveIndex(Math.max(0, options.indexOf(value as DiameterUnit)));
    setIsOpen(true);
    onFocusChange(true);
  }

  function toggleDropdown() {
    if (isOpen) {
      closeDropdown();
      return;
    }

    openDropdown();
  }

  function selectOption(nextValue: string) {
    onChange(nextValue);
    closeDropdown({ restoreFocus: true });
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updateMenuPosition();
    window.requestAnimationFrame(() => menuRef.current?.focus());

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }

      closeDropdown();
    }

    function handleViewportChange() {
      updateMenuPosition();
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(Math.max(0, options.indexOf(value as DiameterUnit)));
  }, [options, value]);

  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();

      if (!isOpen) {
        openDropdown();
        return;
      }

      if (event.key === "ArrowDown") {
        setActiveIndex((current) => (current + 1) % options.length);
        return;
      }

      if (event.key === "ArrowUp") {
        setActiveIndex((current) => (current - 1 + options.length) % options.length);
        return;
      }

      selectOption(options[activeIndex]);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown({ restoreFocus: true });
      return;
    }

    if (event.key === "Tab") {
      closeDropdown();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % options.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + options.length) % options.length);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectOption(options[activeIndex]);
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        aria-controls={isOpen ? listboxId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex h-full w-full items-center justify-between gap-2 bg-transparent px-4 py-3 text-left text-sm text-slate-900 outline-none transition"
        onBlur={(event) => {
          const nextTarget = event.relatedTarget as Node | null;
          const focusMovedInsideMenu = !!(nextTarget && menuRef.current?.contains(nextTarget));

          if (focusMovedInsideMenu) {
            return;
          }

          if (isOpen) {
            closeDropdown();
            return;
          }

          if (!event.currentTarget.contains(nextTarget)) {
            onFocusChange(false);
          }
        }}
        onClick={toggleDropdown}
        onFocus={() => onFocusChange(true)}
        onKeyDown={handleButtonKeyDown}
        role="combobox"
        type="button"
      >
        <span className="truncate font-medium">{value}</span>
        <svg
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="M7 10l5 5 5-5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </button>

      {isOpen && menuPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="z-[120] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.14)] outline-none"
              id={listboxId}
              onKeyDown={handleMenuKeyDown}
              role="listbox"
              style={{
                left: menuPosition.left,
                position: "fixed",
                top: menuPosition.top,
                width: menuPosition.width
              }}
              tabIndex={-1}
            >
              <div className="p-2">
                {options.map((option, index) => {
                  const isSelected = option === value;
                  const isActive = index === activeIndex;

                  return (
                    <button
                      key={option}
                      aria-selected={isSelected}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition ${
                        isSelected
                          ? "bg-slateblue-600 text-white"
                          : isActive
                            ? "bg-slateblue-50 text-slate-900"
                            : "text-slate-900 hover:bg-slateblue-50"
                      }`}
                      onClick={() => selectOption(option)}
                      onMouseEnter={() => setActiveIndex(index)}
                      role="option"
                      type="button"
                    >
                      <span className="truncate font-medium">{option}</span>
                      {isSelected ? (
                        <svg
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M5 12l4 4L19 6"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.2"
                          />
                        </svg>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export function AssessmentForm<TInput extends Record<string, string | number | undefined>, TResult extends { riskLevel: RiskLevel; riskScore: number }>({
  kind,
  title,
  description,
  sections,
  fields,
  initialValues,
  calculate,
  renderMetrics,
  deriveValues,
  loadedAssessment,
  currentPipeDataRecordId,
  onSavePipeData,
  onOpenPipeDataHistory,
  calculationUnavailableReason,
  scopePipeline
}: {
  kind: AssessmentKind;
  title: string;
  description: string;
  sections: FormSection[];
  fields: Field[];
  initialValues: TInput;
  calculate: (input: TInput) => TResult;
  renderMetrics: (result: TResult) => ResultMetric[];
  deriveValues?: (input: TInput) => Partial<TInput>;
  loadedAssessment?: LoadedAssessment<TInput, TResult> | null;
  currentPipeDataRecordId?: string | null;
  onSavePipeData?: (payload: {
    recordId?: string | null;
    assessment: StoredAssessment;
  }) => Promise<PipeDataSaveResult>;
  onOpenPipeDataHistory?: () => void;
  calculationUnavailableReason?: string;
  scopePipeline?: PipelineRecord | null;
}) {
  const router = useRouter();
  const [formData, setFormData] = useState<TInput>(initialValues);
  const [inspectionDate, setInspectionDate] = useState(getLocalDateInputValue);
  const [result, setResult] = useState<TResult | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [pipeDataNotice, setPipeDataNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineRecord | null>(null);
  const [savedPipeline, setSavedPipeline] = useState<PipelineRecord | null>(null);
  const [isEditingPipelineData, setIsEditingPipelineData] = useState(false);
  const [isPipelineDataDirty, setIsPipelineDataDirty] = useState(false);
  const [isSavingPipelineData, setIsSavingPipelineData] = useState(false);
  const [pipelineDataNotice, setPipelineDataNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [focusedFieldName, setFocusedFieldName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingPipeData, setIsSavingPipeData] = useState(false);
  const submitLockRef = useRef(false);
  const savePipeDataLockRef = useRef(false);
  const latestValidationFailureFieldsRef = useRef<string[]>([]);
  const stableAssessmentIdRef = useRef(`${kind.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  useEffect(() => {
    if (!loadedAssessment) {
      return;
    }

    if (loadedAssessment.assessmentId) {
      stableAssessmentIdRef.current = loadedAssessment.assessmentId;
    }

    setInspectionDate(toDateInputValue(loadedAssessment.inspectionDate));
    const loadedInput = prepareLoadedAssessmentInput(loadedAssessment.input);
    setFormData({
      ...loadedInput,
      ...(deriveValues ? deriveValues(loadedInput) : {})
    });
    setResult(loadedAssessment.result ?? null);
    setFormNotice(null);
    setPipeDataNotice(null);
    setFieldErrors({});

    const loadedPipelineId = String(loadedInput.pipelineId ?? "").trim();
    if (!loadedPipelineId) {
      setSelectedPipeline(null);
      return;
    }

    let isCurrent = true;
    void fetchPipelineById(loadedPipelineId)
      .then((pipeline) => {
        if (isCurrent) {
          setSelectedPipeline(pipeline);
          setSavedPipeline(pipeline);
          setIsEditingPipelineData(false);
          setIsPipelineDataDirty(false);
          setPipelineDataNotice(null);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setSelectedPipeline(null);
          setSavedPipeline(null);
          setIsEditingPipelineData(false);
          setIsPipelineDataDirty(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [deriveValues, loadedAssessment]);

  function prepareLoadedAssessmentInput(input: TInput): TInput {
    input = restoreAssessmentDisplayInput(input);
    const selectedUnit = isWallThicknessUnit(input.wallThicknessUnit) ? input.wallThicknessUnit : "mm";
    const displayValue =
      typeof input.wallThicknessDisplayValue === "number" ? input.wallThicknessDisplayValue : input.wallThickness;
    const next = {
      ...input,
      wallThickness: displayValue,
      wallThicknessUnit: selectedUnit
    } as Record<string, unknown>;

    for (const valueField of ["soilTemperature", "temperature"]) {
      const metadata = getTemperatureMetadata(valueField);
      if (!metadata || !(valueField in input)) {
        continue;
      }

      const unit = isTemperatureUnit(input[metadata.unitField]) ? input[metadata.unitField] : "C";
      const normalizedCelsius = Number(input[valueField] ?? 0);
      next[metadata.valueField] = Number.isFinite(normalizedCelsius) ? normalizedCelsius : input[valueField];
      next[metadata.inputValueField] =
        typeof input[metadata.inputValueField] === "number"
          ? input[metadata.inputValueField]
          : input[valueField];
      next[metadata.unitField] = unit;
    }

    return next as TInput;
  }

  function getDisplayUnit(field: Field) {
    if (field.unitOptions?.length) {
      return undefined;
    }

    if (field.name === "cpInputValue") {
      return String(formData.cpInputType ?? "") === "CP Polarized Potential" ? "V vs CSE" : "mV";
    }

    if (field.name === "acInputValue") {
      const acInputType = String(formData.acInputType ?? "");
      return acInputType === "AC Voltage to Remote Earth" || acInputType === "Pipe AC Voltage to Remote Earth"
        ? "V"
        : "A/m^2";
    }

    return field.unit;
  }

  function normalizeDiameterInput(input: TInput): TInput {
    const enteredDiameter = Number(input.pipeIdDiameter ?? 0);
    const selectedUnit = String(input.pipeIdDiameterUnit ?? "mm") as DiameterUnit;

    return {
      ...input,
      pipeIdDiameter: enteredDiameter * DIAMETER_UNIT_TO_MM[selectedUnit],
      pipeIdDiameterDisplayValue: enteredDiameter,
      pipeIdDiameterUnit: selectedUnit
    } as TInput;
  }

  function normalizePressureInput(input: TInput): TInput {
    const next = { ...input } as Record<string, unknown>;

    if ("operatingPressure" in next) {
      const selectedUnit = isPressureUnit(next.operatingPressureUnit) ? next.operatingPressureUnit : "bar";
      const enteredPressure = Number(next.operatingPressure ?? 0);
      next.operatingPressure = pressureToBar(enteredPressure, selectedUnit);
      next.operatingPressureDisplayValue = enteredPressure;
      next.operatingPressureUnit = selectedUnit;
    }

    if ("pipelinePressure" in next) {
      const selectedUnit = isPressureUnit(next.pipelinePressureUnit) ? next.pipelinePressureUnit : "bar";
      const enteredPressure = Number(next.pipelinePressure ?? 0);
      next.pipelinePressure = pressureToBar(enteredPressure, selectedUnit);
      next.pipelinePressureDisplayValue = enteredPressure;
      next.pipelinePressureUnit = selectedUnit;
    }

    return next as TInput;
  }

  function normalizeWallThicknessInput(input: TInput): TInput {
    const selectedUnit = isWallThicknessUnit(input.wallThicknessUnit) ? input.wallThicknessUnit : "mm";
    const enteredWallThickness = Number(input.wallThickness ?? 0);

    return {
      ...input,
      wallThickness: wallThicknessToMm(enteredWallThickness, selectedUnit),
      wallThicknessDisplayValue: enteredWallThickness,
      wallThicknessUnit: selectedUnit
    } as TInput;
  }

  function normalizeTemperatureInputs(input: TInput): TInput {
    const next = { ...input } as Record<string, unknown>;

    for (const valueField of ["soilTemperature", "temperature"]) {
      if (!(valueField in next)) {
        continue;
      }

      const metadata = getTemperatureMetadata(valueField);
      if (!metadata) {
        continue;
      }

      const unitCandidate = next[metadata.unitField];
      const selectedUnit: TemperatureUnit = isTemperatureUnit(unitCandidate) ? unitCandidate : "C";
      const enteredTemperature =
        typeof next[metadata.inputValueField] === "number"
          ? next[metadata.inputValueField]
          : Number(next[metadata.valueField] ?? 0);
      next[metadata.valueField] = temperatureToCelsius(Number(enteredTemperature), selectedUnit);
      next[metadata.inputValueField] = enteredTemperature;
      next[metadata.unitField] = selectedUnit;
    }

    return next as TInput;
  }

  function sanitizeStoredAssessmentInput(input: TInput): TInput {
    if (kind !== "Internal") {
      return input;
    }

    const next = { ...input } as Record<string, unknown>;
    delete next.installationYear;
    return next as TInput;
  }

  function isPipelineMasterField(field: Field) {
    return field.section === "Pipe Data";
  }

  function isPipelineMasterLocked(field: Field) {
    return isPipelineMasterField(field) && Boolean(selectedPipeline) && (kind === "External" || !isEditingPipelineData);
  }

  function buildPipelineInputFromForm(pipeline: PipelineRecord): PipelineInput {
    const next: PipelineInput = {
      pipelineCode: pipeline.pipelineCode,
      pipelineName: String(formData.pipelineName ?? pipeline.pipelineName).trim(),
      location: String(formData.pipeLocationId ?? pipeline.location ?? "").trim(),
      serviceOrProduct: pipeline.serviceOrProduct,
      pipeLocationId: String(formData.pipeLocationId ?? "").trim(),
      pipeMaterial: String(formData.pipeMaterial ?? "").trim(),
      pipeMaterialOther: String(formData.pipeMaterialOther ?? "").trim(),
      pipeGrade: String(formData.pipeGrade ?? "").trim(),
      pipeGradeOther: String(formData.pipeGradeOther ?? "").trim(),
      pipeAgeYears: typeof formData.pipeAge === "number" ? formData.pipeAge : undefined,
      pipeLengthKm: pipeline.pipeLengthKm,
      pipeInsideDiameter: pipeline.pipeInsideDiameter,
      pipeOutsideDiameter: pipeline.pipeOutsideDiameter,
      diameterUnit: String(formData.pipeIdDiameterUnit ?? pipeline.diameterUnit ?? "mm") as DiameterUnit,
      smysMpa: pipeline.smysMpa,
      maopBar: pipeline.maopBar,
      nominalWallThickness: wallThicknessToMm(
        Number(formData.wallThickness ?? pipeline.wallThicknessInputValue ?? pipeline.nominalWallThickness ?? 0),
        isWallThicknessUnit(formData.wallThicknessUnit) ? formData.wallThicknessUnit : "mm"
      ),
      wallThicknessInputValue: Number(formData.wallThickness ?? pipeline.wallThicknessInputValue ?? pipeline.nominalWallThickness ?? 0),
      wallThicknessUnit: isWallThicknessUnit(formData.wallThicknessUnit) ? formData.wallThicknessUnit : "mm",
      designPressure: pipeline.designPressure,
      operatingPressure: pipeline.operatingPressure,
      operatingPressureInputValue: pipeline.operatingPressureInputValue,
      operatingPressureUnit: pipeline.operatingPressureUnit,
      installationYear: pipeline.installationYear,
      inspectionYear: pipeline.inspectionYear,
      installationDate: pipeline.installationDate,
      designLife: pipeline.designLife,
      status: pipeline.status || "Active"
    };

    if (kind === "External") {
      next.pipeLengthKm = typeof formData.pipeLength === "number" ? formData.pipeLength : undefined;
      next.pipeOutsideDiameter = typeof formData.pipeIdDiameter === "number" ? formData.pipeIdDiameter : undefined;
      next.smysMpa = typeof formData.smys === "number" ? formData.smys : undefined;
      next.maopBar = typeof formData.maop === "number" ? formData.maop : undefined;
      next.operatingPressureInputValue =
        typeof formData.operatingPressure === "number" ? formData.operatingPressure : undefined;
      next.operatingPressureUnit = isPressureUnit(formData.operatingPressureUnit) ? formData.operatingPressureUnit : "bar";
      next.operatingPressure =
        typeof next.operatingPressureInputValue === "number"
          ? pressureToBar(next.operatingPressureInputValue, next.operatingPressureUnit ?? "bar")
          : undefined;
      next.installationYear = typeof formData.installationYear === "number" ? formData.installationYear : undefined;
      next.inspectionYear = typeof formData.inspectionYear === "number" ? formData.inspectionYear : undefined;
    }

    if (kind === "Internal") {
      next.pipeInsideDiameter = typeof formData.pipeIdDiameter === "number" ? formData.pipeIdDiameter : undefined;
      next.operatingPressureInputValue =
        typeof formData.pipelinePressure === "number" ? formData.pipelinePressure : undefined;
      next.operatingPressureUnit = isPressureUnit(formData.pipelinePressureUnit) ? formData.pipelinePressureUnit : "bar";
      next.operatingPressure =
        typeof next.operatingPressureInputValue === "number"
          ? pressureToBar(next.operatingPressureInputValue, next.operatingPressureUnit ?? "bar")
          : undefined;
      next.designLife = typeof formData.designLife === "number" ? formData.designLife : undefined;
    }

    return next;
  }

  function validatePipelineMasterDraft(pipelineInput: PipelineInput) {
    const errors: Record<string, string> = {};

    if (!pipelineInput.pipelineName.trim()) {
      errors.pipelineName = "Pipeline Name is required.";
    }

    if (!String(pipelineInput.pipeMaterial ?? "").trim()) {
      errors.pipeMaterial = "Pipe Material is required.";
    }

    if (!String(pipelineInput.pipeGrade ?? "").trim()) {
      errors.pipeGrade = "Select a Pipe Grade.";
    }

    if (!Number.isFinite(Number(pipelineInput.wallThicknessInputValue)) || !(Number(pipelineInput.wallThicknessInputValue) > 0)) {
      errors.wallThickness = "Wall Thickness must be a positive number.";
    }

    if (pipelineInput.installationYear !== undefined && !isReasonableYear(pipelineInput.installationYear)) {
      errors.installationYear = "Enter a reasonable four-digit year.";
    }

    if (pipelineInput.inspectionYear !== undefined && !isReasonableYear(pipelineInput.inspectionYear)) {
      errors.inspectionYear = "Enter a reasonable four-digit year.";
    }

    if (
      typeof pipelineInput.maopBar === "number" &&
      typeof pipelineInput.operatingPressureInputValue === "number" &&
      pressureToBar(pipelineInput.operatingPressureInputValue, pipelineInput.operatingPressureUnit ?? "bar") >
        pipelineInput.maopBar
    ) {
      errors.operatingPressure = "Operating Pressure cannot exceed MAOP.";
      errors.pipelinePressure = "Operating Pressure cannot exceed MAOP.";
    }

    return errors;
  }

  async function handleSavePipelineData() {
    if (!selectedPipeline || isSavingPipelineData) {
      return;
    }

    const pipelineInput = buildPipelineInputFromForm(selectedPipeline);
    const errors = validatePipelineMasterDraft(pipelineInput);
    if (Object.keys(errors).length > 0) {
      setFieldErrors((current) => ({ ...current, ...errors }));
      setPipelineDataNotice({
        tone: "error",
        message: "Pipeline Master Data could not be saved. Review the highlighted fields."
      });
      return;
    }

    setIsSavingPipelineData(true);
    setPipelineDataNotice(null);

    try {
      const saved = await updatePipeline(selectedPipeline.id, pipelineInput);
      setSelectedPipeline(saved);
      setSavedPipeline(saved);
      populatePipelineFields(saved);
      setIsEditingPipelineData(false);
      setIsPipelineDataDirty(false);
      setPipelineDataNotice({ tone: "success", message: "Pipeline Master Data updated." });
    } catch (error) {
      setPipelineDataNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Pipeline Master Data could not be saved."
      });
    } finally {
      setIsSavingPipelineData(false);
    }
  }

  function handleCancelPipelineDataEdit() {
    if (!savedPipeline) {
      setIsEditingPipelineData(false);
      setIsPipelineDataDirty(false);
      return;
    }

    populatePipelineFields(savedPipeline);
    setSelectedPipeline(savedPipeline);
    setIsEditingPipelineData(false);
    setIsPipelineDataDirty(false);
    setPipelineDataNotice(null);
  }

  function handlePipelineSelect(pipeline: PipelineRecord) {
    if (
      isEditingPipelineData &&
      isPipelineDataDirty &&
      typeof window !== "undefined" &&
      !window.confirm("Discard unsaved Pipeline Master Data changes and switch pipelines?")
    ) {
      return false;
    }

    setSelectedPipeline(pipeline);
    setSavedPipeline(pipeline);
    setIsEditingPipelineData(false);
    setIsPipelineDataDirty(false);
    setPipelineDataNotice({ tone: "success", message: "Pipeline History data loaded." });
    populatePipelineFields(pipeline);
    return true;
  }

  useEffect(() => {
    if (!scopePipeline || loadedAssessment) return;
    setSelectedPipeline(scopePipeline);
    setSavedPipeline(scopePipeline);
    populatePipelineFields(scopePipeline);
    // The explicit scope is read-only master context, not an assessment source revision.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopePipeline?.id]);

  function updateValue(name: string, value: string) {
    const field = fields.find((item) => item.name === name);
    if (field && isPipelineMasterLocked(field)) {
      return;
    }

    if (field && isPipelineMasterField(field) && isEditingPipelineData) {
      setIsPipelineDataDirty(true);
      setPipelineDataNotice(null);
    }

    setFormNotice(null);
    setPipeDataNotice(null);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[name];

      if (name === "pipeMaterial") {
        delete next.pipeGrade;
        delete next.pipeMaterialOther;
        delete next.pipeGradeOther;
      }

      if (name === "pipeGrade") {
        delete next.pipeGradeOther;
      }

      if (name === "coatingType") {
        delete next.coatingTypeOther;
      }

      if (name === "internalCoating") {
        delete next.internalCoatingOther;
      }

      if (name === "groundwaterPresence") {
        delete next.groundwaterCondition;
      }

      if (name === "cpInputType") {
        delete next.cpInputValue;
      }

      if (name === "acInputType") {
        delete next.acInputValue;
      }

      return next;
    });
    setFormData((current) => {
      if (name === "operatingPressureUnit" || name === "pipelinePressureUnit") {
        const pressureFieldName = name === "operatingPressureUnit" ? "operatingPressure" : "pipelinePressure";
        const currentUnit = isPressureUnit(current[name]) ? current[name] : "bar";
        const nextUnit = isPressureUnit(value) ? value : "bar";
        const currentPressure = Number(current[pressureFieldName] ?? 0);
        const nextPressure = Number.isFinite(currentPressure)
          ? roundPressure(pressureFromBar(pressureToBar(currentPressure, currentUnit), nextUnit))
          : currentPressure;
        const baseNext = {
          ...current,
          [pressureFieldName]: nextPressure,
          [name]: nextUnit
        };

        return (deriveValues ? { ...baseNext, ...deriveValues(baseNext as TInput) } : baseNext) as TInput;
      }

      if (name === "wallThicknessUnit") {
        const currentUnit = isWallThicknessUnit(current.wallThicknessUnit) ? current.wallThicknessUnit : "mm";
        const nextUnit = isWallThicknessUnit(value) ? value : "mm";
        const currentWallThickness = Number(current.wallThickness ?? 0);
        const nextWallThickness = Number.isFinite(currentWallThickness)
          ? roundWallThickness(wallThicknessFromMm(wallThicknessToMm(currentWallThickness, currentUnit), nextUnit))
          : currentWallThickness;
        const baseNext = {
          ...current,
          wallThickness: nextWallThickness,
          wallThicknessUnit: nextUnit
        };

        return (deriveValues ? { ...baseNext, ...deriveValues(baseNext as TInput) } : baseNext) as TInput;
      }

      const temperatureMetadata = getTemperatureMetadata(name);
      if (temperatureMetadata && name === temperatureMetadata.unitField) {
        const nextUnit = isTemperatureUnit(value) ? value : "C";
        const normalizedCelsius = Number(current[temperatureMetadata.valueField] ?? 0);
        const nextDisplayValue = Number.isFinite(normalizedCelsius)
          ? roundTemperature(temperatureFromCelsius(normalizedCelsius, nextUnit))
          : normalizedCelsius;
        const baseNext = {
          ...current,
          [temperatureMetadata.valueField]: normalizedCelsius,
          [temperatureMetadata.inputValueField]: nextDisplayValue,
          [temperatureMetadata.unitField]: nextUnit
        };

        return (deriveValues ? { ...baseNext, ...deriveValues(baseNext as TInput) } : baseNext) as TInput;
      }

      if (temperatureMetadata && name === temperatureMetadata.valueField) {
        const unitCandidate = current[temperatureMetadata.unitField];
        const selectedUnit: TemperatureUnit = isTemperatureUnit(unitCandidate) ? unitCandidate : "C";
        const enteredTemperature = Number(value);
        const baseNext = {
          ...current,
          [temperatureMetadata.valueField]: temperatureToCelsius(enteredTemperature, selectedUnit),
          [temperatureMetadata.inputValueField]: enteredTemperature,
          [temperatureMetadata.unitField]: selectedUnit
        };

        return (deriveValues ? { ...baseNext, ...deriveValues(baseNext as TInput) } : baseNext) as TInput;
      }

      const baseNext = {
        ...current,
        [name]:
          field?.type === "number"
            ? Number(value)
            : field?.type === "date"
              ? value
            : value
      };

      const next = deriveValues ? { ...baseNext, ...deriveValues(baseNext as TInput) } : baseNext;

      if (name === "pipeMaterial") {
        return {
          ...next,
          pipeGrade: "",
          pipeGradeOther: "",
          pipeMaterialOther: value === "Other" ? current.pipeMaterialOther ?? "" : ""
        } as TInput;
      }

      if (name === "pipeGrade" && value !== "Other") {
        return {
          ...next,
          pipeGradeOther: ""
        } as TInput;
      }

      if (name === "coatingType" && value !== "Other") {
        return {
          ...next,
          coatingTypeOther: ""
        } as TInput;
      }

      if (name === "internalCoating" && value !== "Other") {
        return {
          ...next,
          internalCoatingOther: ""
        } as TInput;
      }

      if (name === "groundwaterPresence") {
        return {
          ...next,
          groundwaterCondition: isNoGroundwaterValue(value) ? "Not Applicable" : "Unknown / Not Tested"
        } as TInput;
      }

      if (name === "cpInputType") {
        return {
          ...next,
          cpInputValue: 0
        } as TInput;
      }

      if (name === "acInputType") {
        return {
          ...next,
          acInputValue: 0
        } as TInput;
      }

      return next as TInput;
    });
  }

  function updateInspectionDate(value: string) {
    setInspectionDate(value);
    setFormNotice(null);
    setPipeDataNotice(null);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.inspectionDate;
      return next;
    });
  }

  function populatePipelineFields(pipeline: PipelineRecord) {
    setFormData((current) => {
      const next: Record<string, unknown> = {
        ...current,
        pipelineId: pipeline.id,
        pipelineName: pipeline.pipelineName,
        pipeLocationId: pipeline.pipeLocationId ?? pipeline.location ?? initialValues.pipeLocationId ?? "",
        pipeMaterial: pipeline.pipeMaterial ?? initialValues.pipeMaterial ?? "",
        pipeMaterialOther: pipeline.pipeMaterialOther ?? initialValues.pipeMaterialOther ?? "",
        pipeGrade: pipeline.pipeGrade ?? initialValues.pipeGrade ?? "",
        pipeGradeOther: pipeline.pipeGradeOther ?? initialValues.pipeGradeOther ?? "",
        pipeAge: pipeline.pipeAgeYears ?? initialValues.pipeAge ?? 0,
        wallThickness:
          pipeline.wallThicknessInputValue ?? (typeof pipeline.nominalWallThickness === "number"
            ? wallThicknessFromMm(pipeline.nominalWallThickness, isWallThicknessUnit(pipeline.wallThicknessUnit) ? pipeline.wallThicknessUnit : "mm")
            : initialValues.wallThickness ?? 0),
        wallThicknessUnit: pipeline.wallThicknessUnit ?? initialValues.wallThicknessUnit ?? "mm"
      };

      if (kind === "External") {
        next.operatingPressure =
          pipeline.operatingPressureInputValue ?? (typeof pipeline.operatingPressure === "number"
            ? pressureFromBar(pipeline.operatingPressure, isPressureUnit(pipeline.operatingPressureUnit) ? pipeline.operatingPressureUnit : "bar")
            : initialValues.operatingPressure ?? 0);
        next.operatingPressureUnit = pipeline.operatingPressureUnit ?? initialValues.operatingPressureUnit ?? "bar";
        next.pipeLength = pipeline.pipeLengthKm ?? initialValues.pipeLength ?? 0;
        next.pipeIdDiameter = pipeline.pipeOutsideDiameter ?? initialValues.pipeIdDiameter ?? 0;
        next.pipeIdDiameterDisplayValue =
          pipeline.pipeOutsideDiameter ?? initialValues.pipeIdDiameterDisplayValue ?? undefined;
        next.pipeIdDiameterUnit = pipeline.diameterUnit ?? initialValues.pipeIdDiameterUnit ?? "mm";
        next.smys = pipeline.smysMpa ?? initialValues.smys ?? 0;
        next.maop = pipeline.maopBar ?? initialValues.maop ?? 0;
        next.installationYear = pipeline.installationYear ?? initialValues.installationYear ?? 0;
        next.inspectionYear = pipeline.inspectionYear ?? initialValues.inspectionYear ?? 0;
      }

      if (kind === "Internal") {
        next.pipelinePressure =
          pipeline.operatingPressureInputValue ?? pipeline.operatingPressure ?? initialValues.pipelinePressure ?? 0;
        next.pipelinePressureUnit = pipeline.operatingPressureUnit ?? initialValues.pipelinePressureUnit ?? "bar";
        next.pipeIdDiameter = pipeline.pipeInsideDiameter ?? pipeline.pipeOutsideDiameter ?? initialValues.pipeIdDiameter ?? 0;
        next.pipeIdDiameterDisplayValue =
          pipeline.pipeInsideDiameter ?? pipeline.pipeOutsideDiameter ?? initialValues.pipeIdDiameterDisplayValue ?? undefined;
        next.pipeIdDiameterUnit = pipeline.diameterUnit ?? initialValues.pipeIdDiameterUnit ?? "mm";
        next.designLife = pipeline.designLife ?? initialValues.designLife ?? 0;
      }

      return next as TInput;
    });
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.pipelineId;
      return next;
    });
  }

  function formatMasterText(value: unknown) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? String(value) : "Not provided";
    }

    if (typeof value === "string") {
      return value.trim() || "Not provided";
    }

    return "Not provided";
  }

  function formatMasterNumber(value: unknown, unit?: string) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return "Not provided";
    }

    return unit ? `${value} ${unit}` : String(value);
  }

  function getPipelineMasterDisplayValue(field: Field) {
    const pipeline = savedPipeline ?? selectedPipeline;
    if (!pipeline) {
      return "Not provided";
    }

    if (field.name === "pipelineName") {
      return formatMasterText(pipeline.pipelineName);
    }

    if (field.name === "pipeLocationId") {
      return formatMasterText(pipeline.pipeLocationId ?? pipeline.location);
    }

    if (field.name === "pipeMaterial") {
      const material = formatMasterText(pipeline.pipeMaterial);
      if (material === "Other" && pipeline.pipeMaterialOther) {
        return `Other (${pipeline.pipeMaterialOther})`;
      }
      return material;
    }

    if (field.name === "pipeGrade") {
      const grade = formatMasterText(pipeline.pipeGrade);
      if (grade === "Other" && pipeline.pipeGradeOther) {
        return `Other (${pipeline.pipeGradeOther})`;
      }
      return grade;
    }

    if (field.name === "pipeAge") {
      return formatMasterNumber(pipeline.pipeAgeYears, "years");
    }

    if (field.name === "pipeLength") {
      return formatMasterNumber(pipeline.pipeLengthKm, "km");
    }

    if (field.name === "pipeIdDiameter") {
      const diameter =
        kind === "External"
          ? pipeline.pipeOutsideDiameter
          : pipeline.pipeInsideDiameter ?? pipeline.pipeOutsideDiameter;
      return formatMasterNumber(diameter, pipeline.diameterUnit ?? "mm");
    }

    if (field.name === "smys") {
      return formatMasterNumber(pipeline.smysMpa, "MPa");
    }

    if (field.name === "maop") {
      return formatMasterNumber(pipeline.maopBar, "bar");
    }

    if (field.name === "operatingPressure" || field.name === "pipelinePressure") {
      return formatMasterNumber(
        pipeline.operatingPressureInputValue ?? (typeof pipeline.operatingPressure === "number"
          ? pressureFromBar(pipeline.operatingPressure, isPressureUnit(pipeline.operatingPressureUnit) ? pipeline.operatingPressureUnit : "bar") : undefined),
        pipeline.operatingPressureUnit ?? "bar"
      );
    }

    if (field.name === "installationYear") {
      return formatMasterNumber(pipeline.installationYear);
    }

    if (field.name === "inspectionYear") {
      return formatMasterNumber(pipeline.inspectionYear);
    }

    if (field.name === "wallThickness") {
      return formatMasterNumber(
        pipeline.wallThicknessInputValue ?? (typeof pipeline.nominalWallThickness === "number"
          ? wallThicknessFromMm(pipeline.nominalWallThickness, isWallThicknessUnit(pipeline.wallThicknessUnit) ? pipeline.wallThicknessUnit : "mm") : undefined),
        pipeline.wallThicknessUnit ?? "mm"
      );
    }

    if (field.name === "designLife") {
      return formatMasterNumber(pipeline.designLife, "years");
    }

    return formatMasterText(formData[field.name]);
  }

  function renderPipelineMasterSummary(sectionFields: Field[]) {
    const pipeline = savedPipeline ?? selectedPipeline;
    const summaryFields = pipeline
      ? [
          { key: "pipelineCode", label: "Pipeline Code", value: formatMasterText(pipeline.pipelineCode) },
          { key: "status", label: "Pipeline Status", value: formatMasterText(pipeline.status) }
        ]
      : [];

    return (
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaryFields.map((field) => (
          <div
            key={field.key}
            className="min-h-[92px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {field.label}
            </p>
            <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-900">
              {field.value}
            </p>
          </div>
        ))}
        {sectionFields.map((field) => {
          const materialOption = getPipeMaterialOption(String(formData.pipeMaterial ?? ""));
          const fieldLabel =
            field.name === "pipeGrade" && materialOption ? materialOption.gradeLabel : field.label;
          return (
            <div
              key={field.name}
              className="min-h-[92px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {fieldLabel}
              </p>
              <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-900">
                {getPipelineMasterDisplayValue(field)}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  function buildAssessmentFromCurrentForm() {
    if (calculationUnavailableReason) {
      setFormNotice(calculationUnavailableReason);
      return null;
    }
    const preparedFormData = deriveValues ? ({ ...formData, ...deriveValues(formData) } as TInput) : formData;

    if (!validateForm(preparedFormData)) {
      logSaveDiagnostic({
        event: "stored_assessment_construction_failed",
        assessmentKind: kind,
        storedAssessmentConstructed: false,
        validationFailureFields: latestValidationFailureFieldsRef.current
      });
      setResult(null);
      setFormNotice(null);
      return null;
    }

    const pipeMaterial = String(preparedFormData.pipeMaterial ?? "");
    const pipeGrade = String(preparedFormData.pipeGrade ?? "");
    if (UNSUPPORTED_PIPE_MATERIALS.has(pipeMaterial) || pipeGrade === "Other") {
      setResult(null);
      setFormNotice(
        "Assessment model not yet configured for this material and grade. Please use a supported metallic material-grade combination for the current placeholder assessment."
      );
      logSaveDiagnostic({
        event: "stored_assessment_construction_failed",
        assessmentKind: kind,
        storedAssessmentConstructed: false,
        validationFailureFields: ["pipeMaterial", "pipeGrade"]
      });
      return null;
    }

    if (
      String(preparedFormData.coatingType ?? "") === "Other" ||
      String(preparedFormData.internalCoating ?? "") === "Other"
    ) {
      setResult(null);
      setFormNotice("Assessment model not yet configured for this coating type.");
      logSaveDiagnostic({
        event: "stored_assessment_construction_failed",
        assessmentKind: kind,
        storedAssessmentConstructed: false,
        validationFailureFields: kind === "Internal" ? ["internalCoating"] : ["coatingType"]
      });
      return null;
    }

    const normalizedFormData = normalizeTemperatureInputs(
      normalizeWallThicknessInput(normalizePressureInput(normalizeDiameterInput(preparedFormData)))
    );
    const storedInput = sanitizeStoredAssessmentInput(normalizedFormData);
    const calculated = calculate(normalizedFormData);
    setResult(calculated);
    setFormNotice(null);

    const storedAssessment: StoredAssessment = {
      id: stableAssessmentIdRef.current,
      type: kind,
      pipelineId: selectedPipeline?.id,
      pipelineName: String(formData.pipelineName),
      createdAt: new Date().toISOString(),
      inspectionDate,
      riskLevel: calculated.riskLevel,
      riskScore: calculated.riskScore,
      input: storedInput as unknown as StoredAssessment["input"],
      result: calculated as unknown as StoredAssessment["result"]
    };
    logSaveDiagnostic({
      event: "stored_assessment_constructed",
      assessmentKind: kind,
      storedAssessmentConstructed: true
    });

    return {
      normalizedFormData,
      calculated,
      storedAssessment
    };
  }

  function validateForm(draft: TInput = formData) {
    const errors: Record<string, string> = {};
    const pipeMaterial = String(draft.pipeMaterial ?? "");
    const pipeGrade = String(draft.pipeGrade ?? "");
    const pipeIdDiameter = Number(draft.pipeIdDiameter ?? 0);
    const wallThickness = Number(draft.wallThickness ?? 0);

    if (!inspectionDate.trim()) {
      errors.inspectionDate = "Enter the inspection date.";
    } else if (!isValidDateInputValue(inspectionDate)) {
      errors.inspectionDate = "Enter a valid inspection date.";
    }

    if (!pipeMaterial) {
      errors.pipeMaterial = "Select a pipe material.";
    }

    if (pipeMaterial === "Other" && !String(draft.pipeMaterialOther ?? "").trim()) {
      errors.pipeMaterialOther = "Specify the pipe material.";
    }

    if (pipeMaterial && !pipeGrade) {
      errors.pipeGrade = "Select a grade, class, type, schedule, PN, SN, or Other.";
    }

    if (!(pipeIdDiameter > 0)) {
      errors.pipeIdDiameter = "Enter a diameter greater than 0.";
    }

    if (!Number.isFinite(wallThickness) || !(wallThickness > 0)) {
      errors.wallThickness = "Wall Thickness must be a positive number.";
    }

    for (const valueField of ["soilTemperature", "temperature"]) {
      if (!(valueField in draft)) {
        continue;
      }

      const metadata = getTemperatureMetadata(valueField);
      if (!metadata) {
        continue;
      }

      const unitCandidate = draft[metadata.unitField];
      const selectedUnit: TemperatureUnit = isTemperatureUnit(unitCandidate) ? unitCandidate : "C";
      const displayValue =
        typeof draft[metadata.inputValueField] === "number"
          ? Number(draft[metadata.inputValueField])
          : Number(draft[valueField]);
      const normalizedCelsius = temperatureToCelsius(displayValue, selectedUnit);
      if (!Number.isFinite(displayValue) || !Number.isFinite(normalizedCelsius) || normalizedCelsius < -273.15) {
        errors[valueField] =
          valueField === "soilTemperature"
            ? "Soil Temperature must be at or above absolute zero."
            : "Temperature must be at or above absolute zero.";
      }
    }

    if (pipeGrade === "Other" && !String(draft.pipeGradeOther ?? "").trim()) {
      errors.pipeGradeOther = "Specify the grade or class.";
    }

    if (kind === "External" && !String(draft.coatingType ?? "")) {
      errors.coatingType = "Select an external coating type.";
    }

    if (kind === "External" && !String(draft.cpSystemType ?? "").trim()) {
      errors.cpSystemType = "Select a CP system type.";
    }

    if (
      kind === "External" &&
      String(draft.coatingType ?? "") === "Other" &&
      !String(draft.coatingTypeOther ?? "").trim()
    ) {
      errors.coatingTypeOther = "Specify the external coating type.";
    }

    if (kind === "Internal" && !String(draft.internalCoating ?? "")) {
      errors.internalCoating = "Select an internal lining type.";
    }

    if (
      kind === "Internal" &&
      String(draft.internalCoating ?? "") === "Other" &&
      !String(draft.internalCoatingOther ?? "").trim()
    ) {
      errors.internalCoatingOther = "Specify the internal lining type.";
    }

    if (kind === "External") {
      const groundwaterPresence = String(draft.groundwaterPresence ?? "");
      const groundwaterCondition = String(draft.groundwaterCondition ?? "");
      const cpInputType = String(draft.cpInputType ?? "");
      const cpInputValue = Number(draft.cpInputValue ?? 0);
      const manualCpStatusOverride = String(draft.manualCpStatusOverride ?? "No Override");

      if (hasGroundwaterValue(groundwaterPresence) && groundwaterCondition === "Not Applicable") {
        errors.groundwaterCondition =
          "Groundwater condition cannot be Not Applicable when groundwater is present or unknown.";
      }

      if (isNoGroundwaterValue(groundwaterPresence) && groundwaterCondition && groundwaterCondition !== "Not Applicable") {
        errors.groundwaterCondition =
          "Groundwater condition must be Not Applicable when groundwater presence is No Groundwater.";
      }

      if (cpInputType === "CP Polarization" && cpInputValue < 0) {
        errors.cpInputValue = "CP polarization should be entered as a non-negative mV value.";
      }

      if (cpInputType === "CP Polarized Potential" && cpInputValue > 0) {
        errors.cpInputValue = "Polarized potential should be entered as a negative V vs CSE value.";
      }

      if (
        manualCpStatusOverride &&
        manualCpStatusOverride !== "No Override" &&
        !String(draft.cpStatusOverrideReason ?? "").trim()
      ) {
        errors.cpStatusOverrideReason = "Enter the reason for the manual CP status override.";
      }
    }

    if (kind === "External") {
      if (!String(draft.referenceElectrode ?? "").trim()) {
        errors.referenceElectrode = "Enter the reference electrode.";
      }

      if (!(Number(draft.onPotential ?? 0) !== 0)) {
        errors.onPotential = "Enter the ON potential.";
      }

      if (!(Number(draft.offPotential ?? 0) !== 0)) {
        errors.offPotential = "Enter the OFF potential.";
      }

      if (!(Number(draft.installationYear ?? 0) > 0)) {
        errors.installationYear = "Enter the installation year.";
      }

      if (!(Number(draft.inspectionYear ?? 0) > 0)) {
        errors.inspectionYear = "Enter the inspection year.";
      }

      if (Number(draft.inspectionYear ?? 0) > 0 && Number(draft.installationYear ?? 0) > 0) {
        if (Number(draft.inspectionYear) < Number(draft.installationYear)) {
          errors.inspectionYear = "Inspection year cannot be earlier than installation year.";
        }
      }

      if (!(Number(draft.maop ?? 0) > 0)) {
        errors.maop = "Enter the MAOP.";
      }

      if (!(Number(draft.operatingPressure ?? 0) > 0)) {
        errors.operatingPressure = "Enter the operating pressure.";
      }

      if (Number(draft.maop ?? 0) > 0 && Number(draft.operatingPressure ?? 0) >= 0) {
        const operatingPressureUnit = isPressureUnit(draft.operatingPressureUnit)
          ? draft.operatingPressureUnit
          : "bar";
        const operatingPressureBar = pressureToBar(Number(draft.operatingPressure ?? 0), operatingPressureUnit);
        if (operatingPressureBar > Number(draft.maop ?? 0)) {
          errors.operatingPressure = "Operating Pressure cannot exceed MAOP.";
        }
      }

      if (!(Number(draft.smys ?? 0) > 0)) {
        errors.smys = "Enter the SMYS.";
      }

      if (!(Number(draft.measuredThickness ?? 0) > 0)) {
        errors.measuredThickness = "Enter the measured thickness.";
      }

      if (!(Number(draft.corrosionLength ?? 0) > 0)) {
        errors.corrosionLength = "Enter the corrosion length.";
      }

      if (!(Number(draft.corrosionWidth ?? 0) > 0)) {
        errors.corrosionWidth = "Enter the corrosion width.";
      }

      if (!(Number(draft.previousRemainingThickness ?? 0) > 0)) {
        errors.previousRemainingThickness = "Enter the previous remaining thickness.";
      }

      if (!String(draft.previousInspectionDate ?? "").trim()) {
        errors.previousInspectionDate = "Enter the previous inspection date.";
      }

      if (!String(draft.holidayFound ?? "").trim()) {
        errors.holidayFound = "Select whether a holiday was found.";
      }

      if (String(draft.holidayFound ?? "") === "Yes" && !(Number(draft.holidaySize ?? 0) > 0)) {
        errors.holidaySize = "Enter the holiday size.";
      }

      if (!(Number(draft.minimumRequiredThickness ?? 0) > 0)) {
        errors.minimumRequiredThickness = "Minimum required thickness is unavailable.";
      }

      if (String(draft.previousInspectionDate ?? "").trim()) {
        const parsedDate = new Date(String(draft.previousInspectionDate));
        if (Number.isNaN(parsedDate.getTime())) {
          errors.previousInspectionDate = "Enter a valid previous inspection date.";
        }
      }
    }

    setFieldErrors(errors);
    latestValidationFailureFieldsRef.current = Object.keys(errors);
    logSaveDiagnostic({
      event: "client_validation_completed",
      assessmentKind: kind,
      validationFailureFields: latestValidationFailureFieldsRef.current
    });
    return Object.keys(errors).length === 0;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    logSaveDiagnostic({
      event: "submit_handler_entered",
      assessmentKind: kind,
      submitHandlerEntered: true,
      nativeFormValid: event.currentTarget.checkValidity()
    });
    event.preventDefault();

    if (submitLockRef.current) {
      logSaveDiagnostic({
        event: "submit_lock_already_locked",
        assessmentKind: kind,
        submitLock: "already_locked"
      });
      return;
    }
    if (!selectedPipeline) {
      setFormNotice("Select or create a pipeline before saving this assessment.");
      setFieldErrors((current) => ({ ...current, pipelineId: "Select or create a pipeline." }));
      return;
    }
    logSaveDiagnostic({
      event: "submit_lock_acquired",
      assessmentKind: kind,
      submitLock: "acquired"
    });

    const assessmentDraft = buildAssessmentFromCurrentForm();
    if (!assessmentDraft) {
      return;
    }
    const { storedAssessment } = assessmentDraft;
    submitLockRef.current = true;
    setIsSubmitting(true);
    setFormNotice(null);

    try {
      logSaveDiagnostic({
        event: "assessment_save_started",
        assessmentKind: kind,
        assessmentSaveCompleted: false
      });
      await createAssessmentRecord(storedAssessment);
      logSaveDiagnostic({
        event: "assessment_save_completed",
        assessmentKind: kind,
        assessmentSaveCompleted: true
      });
      logSaveDiagnostic({
        event: "report_save_started",
        assessmentKind: kind,
        reportSaveStarted: true,
        reportSaveCompleted: false
      });
      await createReportRecord(storedAssessment);
      logSaveDiagnostic({
        event: "report_save_completed",
        assessmentKind: kind,
        reportSaveStarted: true,
        reportSaveCompleted: true
      });
      logSaveDiagnostic({
        event: "navigation_to_report_attempted",
        assessmentKind: kind,
        navigationAttempted: true
      });
      router.push("/report");
    } catch (error) {
      logSaveDiagnostic({
        event: "save_flow_error",
        assessmentKind: kind,
        errorName: getSanitizedErrorName(error)
      });
      if (isUnauthorizedError(error)) {
        logSaveDiagnostic({
          event: "navigation_to_login_attempted",
          assessmentKind: kind,
          navigationAttempted: true
        });
        router.push("/login");
        return;
      }

      if (isBackendUnavailableError(error)) {
        setFormNotice("Report was not permanently saved. Please try again.");
        return;
      }

      if (error instanceof ApiError && error.fields?.inspectionDate) {
        setFieldErrors((current) => ({ ...current, inspectionDate: error.fields!.inspectionDate }));
      }

      setFormNotice("Report was not permanently saved. Please try again.");
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleSavePipeData() {
    if (!onSavePipeData || savePipeDataLockRef.current) {
      return;
    }

    if (!selectedPipeline) {
      setPipeDataNotice({
        tone: "error",
        message: "Select or create a pipeline before saving pipe data."
      });
      return;
    }

    const assessmentDraft = buildAssessmentFromCurrentForm();
    if (!assessmentDraft) {
      return;
    }

    savePipeDataLockRef.current = true;
    setIsSavingPipeData(true);
    setPipeDataNotice(null);

    try {
      const saveResult = await onSavePipeData({
        recordId: currentPipeDataRecordId,
        assessment: assessmentDraft.storedAssessment
      });
      setPipeDataNotice({
        tone: "success",
        message: saveResult.message
      });
    } catch (error) {
      if (isUnauthorizedError(error)) {
        router.push("/login");
        return;
      }

      const message =
        error instanceof Error
          ? error.message
          : "Pipe data could not be saved. Please try again.";
      setPipeDataNotice({
        tone: "error",
        message
      });
    } finally {
      savePipeDataLockRef.current = false;
      setIsSavingPipeData(false);
    }
  }

  function goToReport() {
    router.push("/report");
  }

  const inspectionDetailsSection = (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="border-b border-slate-200 pb-5">
        <h4 className="text-2xl font-semibold tracking-tight text-slate-900">
          Assessment Details
        </h4>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          Record the field inspection date used for this corrosion assessment.
        </p>
      </div>
      <div className="mt-7 grid gap-x-5 gap-y-6 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-medium text-slate-700">
            Inspection Date
          </span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            required
            type="date"
            value={inspectionDate}
            onChange={(event) => updateInspectionDate(event.target.value)}
          />
          {fieldErrors.inspectionDate ? (
            <p className="mt-2 text-xs font-medium leading-5 text-red-600">
              {fieldErrors.inspectionDate}
            </p>
          ) : null}
        </label>
      </div>
    </div>
  );

  function renderField(field: Field) {
    const materialOption = getPipeMaterialOption(String(formData.pipeMaterial ?? ""));
    const fieldLabel =
      field.name === "pipeGrade" && materialOption ? materialOption.gradeLabel : field.label;
    const showPipeMaterialOther =
      field.name === "pipeMaterial" && String(formData.pipeMaterial) === "Other";
    const showPipeGradeOther =
      field.name === "pipeGrade" && String(formData.pipeGrade) === "Other";
    const showExternalCoatingOther =
      field.name === "coatingType" && String(formData.coatingType) === "Other";
    const showInternalCoatingOther =
      field.name === "internalCoating" && String(formData.internalCoating) === "Other";
    const displayUnit = getDisplayUnit(field);
    const temperatureMetadata = getTemperatureMetadata(field.name);
    const fieldValue =
      temperatureMetadata && field.name === temperatureMetadata.valueField
        ? formData[temperatureMetadata.inputValueField] ?? formData[field.name]
        : formData[field.name];
    const selectedUnit = field.unitFieldName
      ? String(
          formData[field.unitFieldName] ??
            (field.unitFieldName === "soilTemperatureUnit" || field.unitFieldName === "temperatureUnit" ? "C" : "mm")
        )
      : "";
    const pipelineMasterLocked = isPipelineMasterLocked(field);
    const dropdownDisabled = pipelineMasterLocked || isGroundwaterConditionDisabled(
      field.name,
      String(formData.groundwaterPresence ?? "")
    );

    return (
      <div key={field.name} className="contents">
        <label className={`block ${field.fullWidth ? "sm:col-span-2" : ""}`}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="block text-xs font-medium text-slate-700">{fieldLabel}</span>
            {displayUnit ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {displayUnit}
              </span>
            ) : null}
          </div>
          {field.name === "pipeMaterial" ? (
            <PipeMaterialDropdown
              value={String(formData[field.name])}
              onChange={(nextValue) => updateValue(field.name, nextValue)}
              disabled={pipelineMasterLocked}
            />
          ) : field.name === "pipeGrade" ? (
            <PipeGradeDropdown
              material={String(formData.pipeMaterial ?? "")}
              value={String(formData[field.name])}
              onChange={(nextValue) => updateValue(field.name, nextValue)}
              disabled={pipelineMasterLocked}
            />
          ) : field.name === "coatingType" ? (
            <ExternalCoatingDropdown
              value={String(formData[field.name])}
              onChange={(nextValue) => updateValue(field.name, nextValue)}
            />
          ) : field.name === "internalCoating" ? (
            <InternalCoatingDropdown
              value={String(formData[field.name])}
              onChange={(nextValue) => updateValue(field.name, nextValue)}
            />
          ) : field.type === "select" ? (
            <BasicDropdown
              value={String(formData[field.name])}
              onChange={(nextValue) => updateValue(field.name, nextValue)}
              options={
                field.options?.map((option) => ({
                  label: option.label,
                  value: option.value,
                  disabled: option.disabled
                })) ?? []
              }
              placeholder={field.placeholder ?? field.label}
              disabled={dropdownDisabled || Boolean(field.readOnly)}
            />
          ) : field.readOnly && calculationUnavailableReason ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">Not Available</div>
          ) : (
            <div
              className={
                field.unitFieldName && field.unitOptions
                  ? `relative z-10 flex w-full items-stretch overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm transition ${
                      focusedFieldName === field.name
                        ? "border-cyan-500 shadow-[0_0_0_4px_rgba(34,211,238,0.12)]"
                        : ""
                    }`
                  : "relative"
              }
            >
              <div className={field.unitFieldName && field.unitOptions ? "relative flex-1" : ""}>
                <input
                  className={`w-full bg-white px-4 py-3 text-sm text-slate-900 outline-none transition ${
                    field.unitFieldName && field.unitOptions
                      ? "rounded-none border-0 focus:border-0 focus:bg-white"
                      : "rounded-2xl border border-slate-200 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                  } ${displayUnit ? "pr-16" : ""}`}
                  min={field.name === "pipeIdDiameter" ? "0.1" : undefined}
                  type={field.type}
                  readOnly={field.readOnly || pipelineMasterLocked}
                  step={field.step}
                  value={String(fieldValue)}
                  onChange={(event) => updateValue(field.name, event.target.value)}
                  onFocus={() => setFocusedFieldName(field.name)}
                  onBlur={() => setFocusedFieldName((current) => (current === field.name ? null : current))}
                />
                {displayUnit ? (
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-semibold text-slate-400">
                    {displayUnit}
                  </span>
                ) : null}
              </div>
              {field.unitFieldName && field.unitOptions ? (
                <div className="relative flex w-[96px] shrink-0 items-stretch border-l border-slate-200 bg-white">
                  <BasicDropdown
                    value={selectedUnit}
                    onChange={(nextValue) => updateValue(field.unitFieldName!, nextValue)}
                    options={field.unitOptions.map((option) => ({
                      label: formatUnitOptionLabel(field.unitFieldName!, option),
                      value: option
                    }))}
                    placeholder="Unit"
                    withinField
                    disabled={pipelineMasterLocked}
                    onFocusChange={(isFocused) =>
                      setFocusedFieldName((current) => {
                        if (isFocused) {
                          return field.name;
                        }

                        return current === field.name ? null : current;
                      })
                    }
                  />
                </div>
              ) : null}
            </div>
          )}
          {field.helperText ? (
            <p className="mt-2 text-xs leading-5 text-slate-500">{field.helperText}</p>
          ) : null}
          {fieldErrors[field.name] ? (
            <p className="mt-2 text-xs font-medium leading-5 text-red-600">
              {fieldErrors[field.name]}
            </p>
          ) : null}
        </label>

        {showPipeMaterialOther ? (
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-slate-700">
              Specify Pipe Material
            </span>
              <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slateblue-500 focus:bg-white"
              required
              type="text"
              readOnly={field.readOnly}
              disabled={pipelineMasterLocked}
              value={String(formData.pipeMaterialOther ?? "")}
              onChange={(event) => updateValue("pipeMaterialOther", event.target.value)}
            />
            {fieldErrors.pipeMaterialOther ? (
              <p className="mt-2 text-xs font-medium leading-5 text-red-600">
                {fieldErrors.pipeMaterialOther}
              </p>
            ) : null}
          </label>
        ) : null}

        {showPipeGradeOther ? (
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-slate-700">
              {materialOption?.customGradeLabel ?? "Specify Pipe Grade"}
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slateblue-500 focus:bg-white"
              required
              type="text"
              readOnly={field.readOnly}
              disabled={pipelineMasterLocked}
              value={String(formData.pipeGradeOther ?? "")}
              onChange={(event) => updateValue("pipeGradeOther", event.target.value)}
            />
            {fieldErrors.pipeGradeOther ? (
              <p className="mt-2 text-xs font-medium leading-5 text-red-600">
                {fieldErrors.pipeGradeOther}
              </p>
            ) : null}
          </label>
        ) : null}

        {showExternalCoatingOther ? (
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-slate-700">
              Specify External Coating Type
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slateblue-500 focus:bg-white"
              required
              type="text"
              readOnly={field.readOnly}
              value={String(formData.coatingTypeOther ?? "")}
              onChange={(event) => updateValue("coatingTypeOther", event.target.value)}
            />
            {fieldErrors.coatingTypeOther ? (
              <p className="mt-2 text-xs font-medium leading-5 text-red-600">
                {fieldErrors.coatingTypeOther}
              </p>
            ) : null}
          </label>
        ) : null}

        {showInternalCoatingOther ? (
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-slate-700">
              Specify Internal Lining Type
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slateblue-500 focus:bg-white"
              required
              type="text"
              readOnly={field.readOnly}
              value={String(formData.internalCoatingOther ?? "")}
              onChange={(event) => updateValue("internalCoatingOther", event.target.value)}
            />
            {fieldErrors.internalCoatingOther ? (
              <p className="mt-2 text-xs font-medium leading-5 text-red-600">
                {fieldErrors.internalCoatingOther}
              </p>
            ) : null}
          </label>
        ) : null}
      </div>
    );
  }

  function renderSection(section: FormSection) {
    const sectionFields = fields.filter((field) => field.section === section.title);
    const isPipeDataSection = section.title === "Pipe Data";

    if (sectionFields.length === 0) {
      return null;
    }

    return (
      <div
        key={section.title}
        className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="border-b border-slate-200 pb-5">
          <div>
            <h4 className="text-2xl font-semibold tracking-tight text-slate-900">
              {section.title}
            </h4>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            {isPipeDataSection
              ? "Select a pipeline to load its saved information from Pipeline History."
              : section.description}
          </p>
          {isPipeDataSection ? (
            <div className="mt-5 space-y-4">
              {scopePipeline ? <p className="text-sm">Pipeline / Asset Master: {scopePipeline.pipelineName} ({scopePipeline.pipelineCode})</p> : <PipelineSelector
                selectedPipeline={selectedPipeline}
                onSelect={handlePipelineSelect}
                onPopulate={() => undefined}
                mode="select-only"
              />}
              {selectedPipeline && kind !== "External" ? (
                <div className="flex flex-wrap items-center gap-3">
                  {!isEditingPipelineData ? (
                    <button
                      className="rounded-full border border-slateblue-200 bg-slateblue-50 px-5 py-3 text-sm font-semibold text-slateblue-700 transition hover:border-slateblue-300"
                      onClick={() => {
                        setIsEditingPipelineData(true);
                        setIsPipelineDataDirty(false);
                        setPipelineDataNotice(null);
                      }}
                      type="button"
                    >
                      Edit Pipe Data
                    </button>
                  ) : (
                    <>
                      <button
                        className="rounded-full bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                        disabled={isSavingPipelineData}
                        onClick={() => void handleSavePipelineData()}
                        type="button"
                      >
                        {isSavingPipelineData ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
                        onClick={handleCancelPipelineDataEdit}
                        type="button"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              ) : null}
              {pipelineDataNotice ? (
                <div
                  className={`rounded-3xl px-5 py-4 text-sm font-medium leading-6 ${
                    pipelineDataNotice.tone === "success"
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border border-rose-200 bg-rose-50 text-rose-800"
                  }`}
                >
                  {pipelineDataNotice.message}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {isPipeDataSection && !selectedPipeline ? null : isPipeDataSection && !isEditingPipelineData ? (
          renderPipelineMasterSummary(sectionFields)
        ) : (
          <div className="mt-7 grid gap-x-5 gap-y-6 sm:grid-cols-2">
            {sectionFields.map(renderField)}
          </div>
        )}
      </div>
    );
  }

  const resultPanel = (
    <Panel className="h-fit">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slateblue-600">
        Prediction Results
      </p>
      <h3 className="mt-3 text-xl font-semibold text-slate-900">Assessment Output</h3>
      <p className="mt-2 text-sm text-slate-500">
        Results use simplified placeholder logic for Phase 1 UI validation.
      </p>
      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        Preliminary assessment: These results use prototype calculation logic and are not
        engineering-certified. Do not use them as the sole basis for operational, safety or
        maintenance decisions.
      </div>

      {calculationUnavailableReason ? <p role="status" className="mt-4 text-sm text-amber-800">{calculationUnavailableReason}</p> : null}

      {result ? (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between rounded-3xl bg-slate-50 p-4">
            <div>
              <p className="text-sm text-slate-500">{kind === "External" ? "Legacy screening score (not official risk)" : "Risk Score"}</p>
              <p className="text-3xl font-semibold text-slate-900">{calculationUnavailableReason ? "Not Available" : result.riskScore}</p>
            </div>
            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${getRiskBadgeClasses(result.riskLevel)}`}
            >
              {calculationUnavailableReason ? "Not Available" : result.riskLevel}
            </span>
          </div>

          <div className="space-y-3">
            {renderMetrics(result).map((metric) => (
              <div
                key={metric.label}
                className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <span className="text-sm text-slate-500">{metric.label}</span>
                <span className="text-right text-sm font-semibold text-slate-900">
                  {metric.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-500">
          Submit the form to generate a placeholder corrosion assessment and populate the report page.
        </div>
      )}
    </Panel>
  );

  const actionButtons = (
    <div className="flex flex-wrap gap-3 pt-3">
      <button
        className="rounded-full bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white"
        disabled={isSubmitting || Boolean(calculationUnavailableReason)}
        title={calculationUnavailableReason}
        aria-busy={isSubmitting}
        type="submit"
      >
        {kind === "Internal" ? "Run Internal Assessment" : "Run External Assessment"}
      </button>
      {onSavePipeData ? (
        <button
          className="rounded-full border border-slateblue-200 bg-slateblue-50 px-5 py-3 text-sm font-semibold text-slateblue-700 transition hover:border-slateblue-300"
          disabled={isSavingPipeData || Boolean(calculationUnavailableReason)}
          title={calculationUnavailableReason}
          onClick={handleSavePipeData}
          type="button"
        >
          {isSavingPipeData ? "Saving Pipe Data..." : "Save Pipe Data"}
        </button>
      ) : null}
      {onOpenPipeDataHistory ? (
        <button
          className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
          onClick={onOpenPipeDataHistory}
          type="button"
        >
          Pipe Data History
        </button>
      ) : null}
      {result ? (
        <button
          className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
          onClick={goToReport}
          type="button"
        >
          Open Review & Export
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6">
      <Panel>
        {title || description ? (
          <div>
            {title ? <h3 className="text-2xl font-semibold text-slate-900">{title}</h3> : null}
            {description ? <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p> : null}
          </div>
        ) : null}

        <form className={`${title || description ? "mt-8" : ""} space-y-6`} noValidate onSubmit={onSubmit}>
          {inspectionDetailsSection}
          {sections.map((section) => renderSection(section))}
          {formNotice ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium leading-6 text-amber-800">
              {formNotice}
            </div>
          ) : null}
          {pipeDataNotice ? (
            <div
              className={`rounded-3xl px-5 py-4 text-sm font-medium leading-6 ${
                pipeDataNotice.tone === "success"
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {pipeDataNotice.message}
            </div>
          ) : null}
          {actionButtons}
        </form>
      </Panel>

      {result ? resultPanel : null}
    </div>
  );
}

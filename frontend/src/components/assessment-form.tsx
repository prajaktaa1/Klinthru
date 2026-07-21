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
import { Panel } from "@/components/ui";
import {
  createAssessment as createAssessmentRecord,
  createReport as createReportRecord,
  isBackendUnavailableError,
  isUnauthorizedError
} from "@/lib/apiClient";
import { getRiskBadgeClasses } from "@/lib/riskScoring";
import { saveAssessment } from "@/lib/storage";
import { AssessmentKind, DiameterUnit, RiskLevel, StoredAssessment } from "@/lib/types";
import { getPipeMaterialOption } from "@/lib/pipe-material-options";

type FieldOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

type Field = {
  name: string;
  label: string;
  type: "text" | "number" | "select";
  section: string;
  placeholder?: string;
  step?: string;
  unit?: string;
  helperText?: string;
  fullWidth?: boolean;
  options?: FieldOption[];
  unitFieldName?: string;
  unitOptions?: readonly DiameterUnit[];
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

type LoadedAssessment<TInput extends Record<string, string | number>, TResult> = {
  recordId?: string | null;
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
                          ? "bg-[#2563EB] text-white"
                          : isActive
                            ? "bg-[#EAF2FF] text-slate-900"
                            : "text-slate-900 hover:bg-[#EAF2FF]"
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

export function AssessmentForm<TInput extends Record<string, string | number>, TResult extends { riskLevel: RiskLevel; riskScore: number }>({
  kind,
  title,
  description,
  sections,
  fields,
  initialValues,
  calculate,
  renderMetrics,
  loadedAssessment,
  currentPipeDataRecordId,
  onSavePipeData,
  onOpenPipeDataHistory
}: {
  kind: AssessmentKind;
  title: string;
  description: string;
  sections: FormSection[];
  fields: Field[];
  initialValues: TInput;
  calculate: (input: TInput) => TResult;
  renderMetrics: (result: TResult) => ResultMetric[];
  loadedAssessment?: LoadedAssessment<TInput, TResult> | null;
  currentPipeDataRecordId?: string | null;
  onSavePipeData?: (payload: {
    recordId?: string | null;
    assessment: StoredAssessment;
  }) => Promise<PipeDataSaveResult>;
  onOpenPipeDataHistory?: () => void;
}) {
  const router = useRouter();
  const [formData, setFormData] = useState<TInput>(initialValues);
  const [result, setResult] = useState<TResult | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [pipeDataNotice, setPipeDataNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [focusedFieldName, setFocusedFieldName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingPipeData, setIsSavingPipeData] = useState(false);
  const submitLockRef = useRef(false);
  const savePipeDataLockRef = useRef(false);

  useEffect(() => {
    if (!loadedAssessment) {
      return;
    }

    setFormData(loadedAssessment.input);
    setResult(loadedAssessment.result ?? null);
    setFormNotice(null);
    setPipeDataNotice(null);
    setFieldErrors({});
  }, [loadedAssessment]);

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

  function updateValue(name: string, value: string) {
    const field = fields.find((item) => item.name === name);
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
      const next = {
        ...current,
        [name]:
          field?.type === "number"
            ? Number(value)
            : value
      };

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

  function buildAssessmentFromCurrentForm() {
    if (!validateForm()) {
      setResult(null);
      setFormNotice(null);
      return null;
    }

    const pipeMaterial = String(formData.pipeMaterial ?? "");
    const pipeGrade = String(formData.pipeGrade ?? "");
    if (UNSUPPORTED_PIPE_MATERIALS.has(pipeMaterial) || pipeGrade === "Other") {
      setResult(null);
      setFormNotice(
        "Assessment model not yet configured for this material and grade. Please use a supported metallic material-grade combination for the current placeholder assessment."
      );
      return null;
    }

    if (
      String(formData.coatingType ?? "") === "Other" ||
      String(formData.internalCoating ?? "") === "Other"
    ) {
      setResult(null);
      setFormNotice("Assessment model not yet configured for this coating type.");
      return null;
    }

    const normalizedFormData = normalizeDiameterInput(formData);
    const calculated = calculate(normalizedFormData);
    setResult(calculated);
    setFormNotice(null);

    const storedAssessment: StoredAssessment = {
      id: `${kind.toLowerCase()}-${Date.now()}`,
      type: kind,
      pipelineName: String(formData.pipelineName),
      createdAt: new Date().toISOString(),
      riskLevel: calculated.riskLevel,
      riskScore: calculated.riskScore,
      input: normalizedFormData as unknown as StoredAssessment["input"],
      result: calculated as unknown as StoredAssessment["result"]
    };

    return {
      normalizedFormData,
      calculated,
      storedAssessment
    };
  }

  function validateForm() {
    const errors: Record<string, string> = {};
    const pipeMaterial = String(formData.pipeMaterial ?? "");
    const pipeGrade = String(formData.pipeGrade ?? "");
    const pipeIdDiameter = Number(formData.pipeIdDiameter ?? 0);

    if (!pipeMaterial) {
      errors.pipeMaterial = "Select a pipe material.";
    }

    if (pipeMaterial === "Other" && !String(formData.pipeMaterialOther ?? "").trim()) {
      errors.pipeMaterialOther = "Specify the pipe material.";
    }

    if (pipeMaterial && !pipeGrade) {
      errors.pipeGrade = "Select a grade, class, type, schedule, PN, SN, or Other.";
    }

    if (!(pipeIdDiameter > 0)) {
      errors.pipeIdDiameter = "Enter a diameter greater than 0.";
    }

    if (pipeGrade === "Other" && !String(formData.pipeGradeOther ?? "").trim()) {
      errors.pipeGradeOther = "Specify the grade or class.";
    }

    if (kind === "External" && !String(formData.coatingType ?? "")) {
      errors.coatingType = "Select an external coating type.";
    }

    if (kind === "External" && !String(formData.cpSystemType ?? "").trim()) {
      errors.cpSystemType = "Select a CP system type.";
    }

    if (
      kind === "External" &&
      String(formData.coatingType ?? "") === "Other" &&
      !String(formData.coatingTypeOther ?? "").trim()
    ) {
      errors.coatingTypeOther = "Specify the external coating type.";
    }

    if (kind === "Internal" && !String(formData.internalCoating ?? "")) {
      errors.internalCoating = "Select an internal lining type.";
    }

    if (
      kind === "Internal" &&
      String(formData.internalCoating ?? "") === "Other" &&
      !String(formData.internalCoatingOther ?? "").trim()
    ) {
      errors.internalCoatingOther = "Specify the internal lining type.";
    }

    if (kind === "External") {
      const groundwaterPresence = String(formData.groundwaterPresence ?? "");
      const groundwaterCondition = String(formData.groundwaterCondition ?? "");
      const cpInputType = String(formData.cpInputType ?? "");
      const cpInputValue = Number(formData.cpInputValue ?? 0);

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
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitLockRef.current) {
      return;
    }

    const assessmentDraft = buildAssessmentFromCurrentForm();
    if (!assessmentDraft) {
      return;
    }
    const { storedAssessment } = assessmentDraft;
    saveAssessment(storedAssessment);
    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      await createAssessmentRecord(storedAssessment);
      await createReportRecord(storedAssessment);
      router.push("/report");
    } catch (error) {
      if (isUnauthorizedError(error)) {
        router.push("/login");
        return;
      }

      if (isBackendUnavailableError(error)) {
        router.push("/report");
        return;
      }

      // Local storage remains the fallback when the backend is unavailable.
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleSavePipeData() {
    if (!onSavePipeData || savePipeDataLockRef.current) {
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
    const selectedUnit = field.unitFieldName ? String(formData[field.unitFieldName] ?? "mm") : "";
    const dropdownDisabled = isGroundwaterConditionDisabled(
      field.name,
      String(formData.groundwaterPresence ?? "")
    );

    return (
      <div key={field.name} className="contents">
        <label className={`block ${field.fullWidth ? "sm:col-span-2" : ""}`}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="block text-sm font-medium text-slate-700">{fieldLabel}</span>
            {displayUnit ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {displayUnit}
              </span>
            ) : null}
          </div>
          {field.name === "pipeMaterial" ? (
            <PipeMaterialDropdown
              value={String(formData[field.name])}
              onChange={(nextValue) => updateValue(field.name, nextValue)}
            />
          ) : field.name === "pipeGrade" ? (
            <PipeGradeDropdown
              material={String(formData.pipeMaterial ?? "")}
              value={String(formData[field.name])}
              onChange={(nextValue) => updateValue(field.name, nextValue)}
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
              disabled={dropdownDisabled}
            />
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
                  step={field.step}
                  value={String(formData[field.name])}
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
                    options={field.unitOptions.map((option) => ({ label: option, value: option }))}
                    placeholder="Unit"
                    withinField
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
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Specify Pipe Material
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slateblue-500 focus:bg-white"
              required
              type="text"
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
            <span className="mb-2 block text-sm font-medium text-slate-700">
              {materialOption?.customGradeLabel ?? "Specify Pipe Grade"}
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slateblue-500 focus:bg-white"
              required
              type="text"
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
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Specify External Coating Type
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slateblue-500 focus:bg-white"
              required
              type="text"
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
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Specify Internal Lining Type
            </span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slateblue-500 focus:bg-white"
              required
              type="text"
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
            {section.description}
          </p>
        </div>

        <div className="mt-7 grid gap-x-5 gap-y-6 sm:grid-cols-2">
          {sectionFields.map(renderField)}
        </div>
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

      {result ? (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between rounded-3xl bg-slate-50 p-4">
            <div>
              <p className="text-sm text-slate-500">Risk Score</p>
              <p className="text-3xl font-semibold text-slate-900">{result.riskScore}</p>
            </div>
            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ${getRiskBadgeClasses(result.riskLevel)}`}
            >
              {result.riskLevel}
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
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        type="submit"
      >
        {kind === "Internal" ? "Run Internal Assessment" : "Run External Assessment"}
      </button>
      {onSavePipeData ? (
        <button
          className="rounded-full border border-slateblue-200 bg-slateblue-50 px-5 py-3 text-sm font-semibold text-slateblue-700 transition hover:border-slateblue-300"
          disabled={isSavingPipeData}
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
          Open Report Page
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6">
      <Panel>
        <h3 className="text-2xl font-semibold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>

        <form className="mt-8 space-y-6" onSubmit={onSubmit}>
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

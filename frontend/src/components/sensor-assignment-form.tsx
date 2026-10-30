"use client";

import {
  FormEvent,
  KeyboardEvent,
  ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from "react";
import {
  assignmentStatuses,
  dataSources,
  getDefaultSensorDeviceType,
  getDefaultSensorName,
  installationTypes,
  measurementUnits,
  sensorAssignmentCategories,
  sensorDeviceTypesByCategory,
  sensorNamesByCategory,
  valuesMeasuredOptions
} from "@/lib/sensor-assignment-options";
import {
  SensorAssignmentCategory,
  SensorAssignmentInput,
  SensorAssignmentRecord,
  DeviceRecord
} from "@/lib/types";

const defaultCategory: SensorAssignmentCategory = "Internal Corrosion Sensors";

function createEmptyAssignment(): SensorAssignmentInput {
  return {
    sensorId: "",
    sensorName: getDefaultSensorName(defaultCategory),
    sensorCategory: defaultCategory,
    sensorDeviceType: getDefaultSensorDeviceType(defaultCategory),
    pipelineOrAsset: "",
    installationLocation: "",
    installationType: installationTypes[0],
    valuesMeasured: valuesMeasuredOptions[0],
    measurementUnit: measurementUnits[0],
    installationDate: new Date().toISOString().slice(0, 10),
    dataSource: "Manual",
    assignmentStatus: "Active",
    notes: ""
  };
}

function toFormState(record?: SensorAssignmentRecord | null): SensorAssignmentInput {
  if (!record) {
    return createEmptyAssignment();
  }

  return {
    sensorId: record.sensorId,
    sensorName: record.sensorName,
    sensorCategory: record.sensorCategory,
    sensorDeviceType: record.sensorDeviceType,
    pipelineOrAsset: record.pipelineOrAsset,
    installationLocation: record.installationLocation,
    installationType: record.installationType,
    valuesMeasured: record.valuesMeasured,
    measurementUnit: record.measurementUnit,
    installationDate: record.installationDate,
    dataSource: record.dataSource,
    assignmentStatus: record.assignmentStatus,
    notes: record.notes ?? "",
    previousAssignmentId: record.previousAssignmentId
  };
}

export function SensorAssignmentForm({
  devices,
  demoDeviceCount,
  devicesError,
  isDevicesLoading,
  mode,
  selectedAssignment,
  isSaving,
  onCancel,
  onSubmit
}: {
  devices: DeviceRecord[];
  demoDeviceCount: number;
  devicesError: string | null;
  isDevicesLoading: boolean;
  mode: "create" | "edit" | "reassign";
  selectedAssignment?: SensorAssignmentRecord | null;
  isSaving: boolean;
  onCancel: () => void;
  onSubmit: (assignment: SensorAssignmentInput) => Promise<void>;
}) {
  const [formState, setFormState] = useState<SensorAssignmentInput>(() =>
    toFormState(selectedAssignment)
  );
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const submissionPending = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const busy = isSaving || isSubmitting;

  useEffect(() => {
    const nextState = toFormState(selectedAssignment);
    if (mode === "reassign") {
      nextState.pipelineOrAsset = "";
      nextState.installationLocation = "";
      nextState.assignmentStatus = "Active";
      nextState.previousAssignmentId = selectedAssignment?.id;
    }

    setFormState(nextState);
    setValidationMessage(null);
  }, [mode, selectedAssignment]);

  const sensorNames = useMemo(
    () => sensorNamesByCategory[formState.sensorCategory],
    [formState.sensorCategory]
  );
  const sensorDeviceTypes = useMemo(
    () => sensorDeviceTypesByCategory[formState.sensorCategory],
    [formState.sensorCategory]
  );
  const selectedDevice = devices.find((device) => device.deviceId === formState.sensorId) ?? null;
  const selectedDeviceIsRegistered = Boolean(selectedDevice);
  const deviceSelectionRequired = mode !== "edit";

  function categoryForDevice(device: DeviceRecord): SensorAssignmentCategory {
    return device.deviceType === "CP Monitoring Module"
      ? "External Corrosion Sensors"
      : "Internal Process Sensors";
  }

  function selectDevice(deviceId: string) {
    const device = devices.find((candidate) => candidate.deviceId === deviceId);
    if (!device) {
      setFormState((current) => ({ ...current, sensorId: "" }));
      return;
    }

    const category = categoryForDevice(device);
    setFormState((current) => ({
      ...current,
      sensorId: device.deviceId,
      sensorCategory: category,
      sensorName: device.deviceType,
      sensorDeviceType: device.deviceType
    }));
    setValidationMessage(null);
  }

  function updateField<Key extends keyof SensorAssignmentInput>(
    key: Key,
    value: SensorAssignmentInput[Key]
  ) {
    setFormState((current) => {
      if (key !== "sensorCategory") {
        return { ...current, [key]: value };
      }

      const category = value as SensorAssignmentCategory;
      return {
        ...current,
        sensorCategory: category,
        sensorName: getDefaultSensorName(category),
        sensorDeviceType: getDefaultSensorDeviceType(category)
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionPending.current || isSaving || isDevicesLoading || devicesError) return;
    if (deviceSelectionRequired && !selectedDeviceIsRegistered) {
      setValidationMessage("Select a registered sensor before creating or reassigning an assignment.");
      return;
    }

    const missingRequired = [
      ["Sensor ID", formState.sensorId],
      ["Sensor category", formState.sensorCategory],
      ["Sensor name", formState.sensorName],
      ["Sensor/device type", formState.sensorDeviceType],
      ["Pipeline or asset", formState.pipelineOrAsset],
      ["Installation location", formState.installationLocation],
      ["Installation type", formState.installationType],
      ["Values measured", formState.valuesMeasured],
      ["Measurement unit", formState.measurementUnit],
      ["Installation date", formState.installationDate],
      ["Data source", formState.dataSource],
      ["Assignment status", formState.assignmentStatus]
    ].find(([, value]) => !String(value).trim());

    if (missingRequired) {
      setValidationMessage(`${missingRequired[0]} is required.`);
      return;
    }

    const parsedDate = new Date(`${formState.installationDate}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(formState.installationDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== formState.installationDate) {
      setValidationMessage("Installation date must be valid.");
      return;
    }

    if ((formState.installationType === "Other" || formState.measurementUnit === "Other") && !formState.notes?.trim()) {
      setValidationMessage("Add Notes to explain the Other installation type or measurement unit.");
      return;
    }

    setValidationMessage(null);
    submissionPending.current = true;
    setIsSubmitting(true);
    try {
      await onSubmit({
      ...formState,
      sensorId: formState.sensorId.trim(),
      pipelineOrAsset: formState.pipelineOrAsset.trim(),
      installationLocation: formState.installationLocation.trim(),
      notes: formState.notes?.trim()
      });
    } catch {
      setValidationMessage("Sensor assignment could not be saved. Review the details and try again.");
    } finally {
      submissionPending.current = false;
      setIsSubmitting(false);
    }
  }

  const submitLabel =
    mode === "edit" ? "Save Changes" : mode === "reassign" ? "Reassign Sensor" : "Create Assignment";

  return (
    <form className="space-y-5" aria-busy={busy} onSubmit={(event) => void handleSubmit(event)}>
      <fieldset className="min-w-0 space-y-5" disabled={busy}>
      <legend className="sr-only">Sensor assignment details</legend>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Registered sensor" required>
          <select
            className={inputClassName}
            required={deviceSelectionRequired}
            disabled={isDevicesLoading || Boolean(devicesError) || devices.length === 0}
            onChange={(event) => selectDevice(event.target.value)}
            value={selectedDeviceIsRegistered ? formState.sensorId : ""}
          >
            <option value="">{isDevicesLoading ? "Loading registered sensors..." : !selectedDeviceIsRegistered && formState.sensorId ? `Legacy assignment sensor: ${formState.sensorId} (not registered)` : "Select a registered sensor"}</option>
            {devices.map((device) => (
              <option key={device.id} value={device.deviceId}>{device.deviceId} — {device.deviceType}</option>
            ))}
          </select>
        </Field>

        <SelectField label="Sensor category" required>
          <ModernSelect
            label="Sensor category"
            disabled={selectedDeviceIsRegistered}
            onChange={(value) => updateField("sensorCategory", value as SensorAssignmentCategory)}
            options={sensorAssignmentCategories}
            value={formState.sensorCategory}
          />
        </SelectField>

        <SelectField label="Sensor name" required>
          <ModernSelect
            label="Sensor name"
            disabled={selectedDeviceIsRegistered}
            onChange={(value) => updateField("sensorName", value)}
            options={sensorNames}
            value={formState.sensorName}
          />
        </SelectField>

        <SelectField label="Sensor/device type" required>
          <ModernSelect
            label="Sensor/device type"
            disabled={selectedDeviceIsRegistered}
            onChange={(value) => updateField("sensorDeviceType", value)}
            options={sensorDeviceTypes}
            value={formState.sensorDeviceType}
          />
        </SelectField>

        <Field label="Pipeline or asset" required>
          <input
            className={inputClassName}
            required
            maxLength={200}
            placeholder="Pipeline, asset, or section name / ID"
            onChange={(event) => updateField("pipelineOrAsset", event.target.value)}
            value={formState.pipelineOrAsset}
          />
        </Field>

        <Field label="Installation location" required>
          <input
            className={inputClassName}
            required
            maxLength={200}
            placeholder="Section, monitoring location, or station"
            onChange={(event) => updateField("installationLocation", event.target.value)}
            value={formState.installationLocation}
          />
        </Field>

        <SelectField label="Installation type" required>
          <ModernSelect
            label="Installation type"
            onChange={(value) => updateField("installationType", value)}
            options={installationTypes}
            value={formState.installationType}
          />
        </SelectField>

        <SelectField label="Values measured" required>
          <ModernSelect
            label="Values measured"
            onChange={(value) => updateField("valuesMeasured", value)}
            options={valuesMeasuredOptions}
            value={formState.valuesMeasured}
          />
        </SelectField>

        <SelectField label="Measurement unit" required>
          <ModernSelect
            label="Measurement unit"
            onChange={(value) => updateField("measurementUnit", value)}
            options={measurementUnits}
            value={formState.measurementUnit}
          />
        </SelectField>

        <Field label="Installation date" required>
          <input
            className={inputClassName}
            onChange={(event) => updateField("installationDate", event.target.value)}
            type="date"
            required
            value={formState.installationDate}
          />
        </Field>

        <SelectField label="Data source" required>
          <ModernSelect
            label="Data source"
            onChange={(value) => updateField("dataSource", value as never)}
            options={dataSources}
            value={formState.dataSource}
          />
        </SelectField>

        <SelectField label="Assignment status" required>
          <ModernSelect
            label="Assignment status"
            onChange={(value) => updateField("assignmentStatus", value as never)}
            options={assignmentStatuses}
            value={formState.assignmentStatus}
          />
        </SelectField>
      </div>

      {devicesError ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{devicesError}</div>
      ) : null}

      {isDevicesLoading ? <p role="status" className="text-sm text-slate-500">Loading registered sensors...</p> : null}
      {demoDeviceCount > 0 ? <p className="text-xs text-slate-500">Demo records cannot be assigned to operational locations.</p> : null}

      {selectedDevice ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">Selected registered device:</span> {selectedDevice.deviceId} — {selectedDevice.deviceType}. Assignment fields use a stored snapshot; this is not live telemetry.
        </div>
      ) : null}

      {validationMessage ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {validationMessage}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button className={primaryButtonClassName} disabled={busy || (deviceSelectionRequired && (!selectedDeviceIsRegistered || isDevicesLoading || Boolean(devicesError)))} type="submit">
          {busy ? "Saving..." : submitLabel}
        </button>
        <button className={secondaryButtonClassName} disabled={busy} onClick={() => {
          setFormState(toFormState(selectedAssignment));
          setValidationMessage(null);
          onCancel();
        }} type="button">
          Cancel
        </button>
      </div>
      </fieldset>
    </form>
  );
}

export function ModernSelect({
  compact = false,
  disabled = false,
  label,
  onChange,
  options,
  value,
  valueMap = {}
}: {
  compact?: boolean;
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
  valueMap?: Record<string, string>;
}) {
  const buttonId = useId();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(options.indexOf(value), 0);
  const isPlaceholder = valueMap[value] === "";
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(selectedIndex);

  useEffect(() => {
    setFocusedIndex(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      optionRefs.current[focusedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex, isOpen]);

  function chooseOption(nextValue: string) {
    onChange(valueMap[nextValue] ?? nextValue);
    setIsOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setFocusedIndex((current) => (current + direction + options.length) % options.length);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      chooseOption(options[focusedIndex] ?? value);
    }
  }

  return (
    <div className={`relative ${isOpen ? "z-[80]" : "z-20"}`} ref={rootRef}>
      <button
        aria-activedescendant={isOpen ? `${listboxId}-${focusedIndex}` : undefined}
        aria-controls={listboxId}
        aria-disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label}
        className={`${selectButtonClassName} ${compact ? compactSelectButtonClassName : standardSelectButtonClassName} ${
          isOpen ? "border-slateblue-500 shadow-[0_0_0_4px_rgba(56,116,203,0.14)]" : ""
        } ${disabled ? disabledSelectButtonClassName : ""}`}
        disabled={disabled}
        id={buttonId}
        onClick={() => {
          if (disabled) {
            return;
          }

          setFocusedIndex(selectedIndex);
          setIsOpen((current) => !current);
        }}
        onKeyDown={handleKeyDown}
        role="combobox"
        type="button"
      >
        <span className={`truncate ${isPlaceholder ? "text-slate-400" : "text-slate-900"}`}>
          {value}
        </span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      <div
        className={`absolute left-0 right-0 top-[calc(100%+0.45rem)] z-[90] origin-top overflow-hidden rounded-[14px] border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.16),0_3px_10px_rgba(15,23,42,0.08)] transition-all duration-200 ${
          isOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-[0.985] opacity-0"
        }`}
      >
        <div
          aria-labelledby={buttonId}
          className="max-h-64 overflow-y-auto pr-1 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2"
          id={listboxId}
          role="listbox"
        >
          {options.map((option, index) => {
            const isSelected = option === value;
            const isFocused = index === focusedIndex;

            return (
              <button
                aria-selected={isSelected}
                className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors duration-150 ${
                  isSelected
                    ? "bg-slateblue-50 font-semibold text-slateblue-700"
                    : isFocused
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-700 hover:bg-slate-50"
                }`}
                id={`${listboxId}-${index}`}
                key={option}
                onClick={() => chooseOption(option)}
                onMouseEnter={() => setFocusedIndex(index)}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                role="option"
                tabIndex={-1}
                type="button"
              >
                <span className="truncate">{option}</span>
                {isSelected ? <CheckIcon /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0 text-slateblue-600"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.25"
      viewBox="0 0 24 24"
    >
      <path d="m5 12 4 4 10-10" />
    </svg>
  );
}

function Field({
  children,
  label,
  required = false
}: {
  children: ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-medium text-slate-700">
      <span>
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function SelectField({
  children,
  label,
  required = false
}: {
  children: ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="block text-xs font-medium text-slate-700">
      <span>
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </span>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export const inputClassName =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slateblue-400 focus:ring-4 focus:ring-slateblue-100";

const selectButtonClassName =
  "flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white text-sm shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-all duration-200 hover:border-slate-300 focus:border-slateblue-500 focus:shadow-[0_0_0_4px_rgba(56,116,203,0.14)]";

const standardSelectButtonClassName = "min-h-12 px-4 py-3";

const compactSelectButtonClassName = "min-h-11 px-3.5 py-2.5";

const disabledSelectButtonClassName =
  "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 shadow-none hover:border-slate-200";

export const primaryButtonClassName =
  "rounded-2xl bg-slateblue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slateblue-700 disabled:cursor-not-allowed disabled:bg-slate-400";

export const secondaryButtonClassName =
  "rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50";

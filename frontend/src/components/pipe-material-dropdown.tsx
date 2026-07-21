"use client";

import {
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";

import {
  getPipeMaterialGroups,
  getPipeMaterialOption,
  PipeGradeOption
} from "@/lib/pipe-material-options";

type DropdownGroup = {
  label: string;
  options: string[];
};

export type BasicDropdownOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

type MenuPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

export const DROPDOWN_TRIGGER_CLASSES =
  "flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-900 shadow-sm outline-none transition duration-150 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100";

export const DROPDOWN_PANEL_CLASSES =
  "z-[120] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.14)] outline-none";

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M5 12l4 4L19 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function getDropdownMenuPosition(button: HTMLButtonElement): MenuPosition {
  const rect = button.getBoundingClientRect();
  const gap = 8;
  const viewportPadding = 12;
  const preferredHeight = 320;
  const availableHeight = Math.max(96, window.innerHeight - rect.bottom - gap - viewportPadding);

  return {
    left: Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - rect.width - viewportPadding)),
    top: rect.bottom + gap,
    width: rect.width,
    maxHeight: Math.min(preferredHeight, availableHeight)
  };
}

function getNextEnabledOptionIndex(
  options: BasicDropdownOption[],
  currentIndex: number,
  direction: 1 | -1
) {
  if (options.length === 0) {
    return 0;
  }

  let nextIndex = currentIndex;

  for (let attempt = 0; attempt < options.length; attempt += 1) {
    nextIndex = (nextIndex + direction + options.length) % options.length;

    if (!options[nextIndex]?.disabled) {
      return nextIndex;
    }
  }

  return currentIndex;
}

export function BasicDropdown({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  withinField = false,
  onFocusChange
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly BasicDropdownOption[];
  placeholder: string;
  disabled?: boolean;
  withinField?: boolean;
  onFocusChange?: (isFocused: boolean) => void;
}) {
  const listboxId = useId();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(
    Math.max(0, options.findIndex((option) => option.value === value && !option.disabled))
  );
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);

  function updateMenuPosition() {
    const button = buttonRef.current;

    if (!button) {
      return;
    }

    setMenuPosition(getDropdownMenuPosition(button));
  }

  function closeDropdown({ restoreFocus = false }: { restoreFocus?: boolean } = {}) {
    setIsOpen(false);
    onFocusChange?.(false);

    if (restoreFocus) {
      window.requestAnimationFrame(() => buttonRef.current?.focus());
    }
  }

  function openDropdown() {
    if (disabled) {
      return;
    }

    const selectedIndex = options.findIndex((option) => option.value === value && !option.disabled);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : getNextEnabledOptionIndex([...options], -1, 1));
    setIsOpen(true);
    onFocusChange?.(true);
  }

  function selectOption(option: BasicDropdownOption) {
    if (option.disabled) {
      return;
    }

    onChange(option.value);
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
    const selectedIndex = options.findIndex((option) => option.value === value && !option.disabled);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : Math.max(0, activeIndex));
  }, [activeIndex, options, value]);

  useEffect(() => {
    if (disabled) {
      closeDropdown();
    }
  }, [disabled]);

  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }

    if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();

      if (!isOpen) {
        openDropdown();
        return;
      }

      if (event.key === "ArrowDown") {
        setActiveIndex((current) => getNextEnabledOptionIndex([...options], current, 1));
        return;
      }

      if (event.key === "ArrowUp") {
        setActiveIndex((current) => getNextEnabledOptionIndex([...options], current, -1));
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
      setActiveIndex((current) => getNextEnabledOptionIndex([...options], current, 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => getNextEnabledOptionIndex([...options], current, -1));
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectOption(options[activeIndex]);
    }
  }

  const selectedLabel = options.find((option) => option.value === value)?.label ?? "";
  const triggerClasses = withinField
    ? "flex h-full w-full items-center justify-between gap-3 bg-transparent px-4 py-3 text-left text-sm text-slate-900 outline-none transition"
    : `${DROPDOWN_TRIGGER_CLASSES} ${disabled ? "cursor-not-allowed text-slate-400 opacity-80" : ""}`;

  return (
    <>
      <button
        ref={buttonRef}
        aria-controls={isOpen ? listboxId : undefined}
        aria-disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={triggerClasses}
        disabled={disabled}
        onBlur={(event) => {
          const nextTarget = event.relatedTarget as Node | null;

          if (nextTarget && menuRef.current?.contains(nextTarget)) {
            return;
          }

          if (isOpen) {
            closeDropdown();
            return;
          }

          onFocusChange?.(false);
        }}
        onClick={() => {
          if (isOpen) {
            closeDropdown();
            return;
          }

          openDropdown();
        }}
        onFocus={() => onFocusChange?.(true)}
        onKeyDown={handleButtonKeyDown}
        role="combobox"
        type="button"
      >
        <span className={selectedLabel ? "truncate" : "truncate text-slate-400"}>
          {selectedLabel || placeholder}
        </span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {isOpen && menuPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className={DROPDOWN_PANEL_CLASSES}
              id={listboxId}
              onKeyDown={handleMenuKeyDown}
              role="listbox"
              style={{
                left: menuPosition.left,
                maxHeight: menuPosition.maxHeight,
                position: "fixed",
                top: menuPosition.top,
                width: menuPosition.width
              }}
              tabIndex={-1}
            >
              <div
                className="overflow-y-auto overflow-x-hidden p-2"
                style={{ maxHeight: menuPosition.maxHeight }}
              >
                <div className="space-y-1">
                  {options.map((option, index) => {
                    const isSelected = option.value === value;
                    const isActive = index === activeIndex;

                    return (
                      <button
                        key={option.value}
                        aria-selected={isSelected}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                          option.disabled
                            ? "cursor-not-allowed text-slate-300"
                            : isSelected
                              ? "bg-cyan-600 text-white"
                              : isActive
                                ? "bg-cyan-50 text-slate-900"
                                : "text-slate-700 hover:bg-cyan-50"
                        }`}
                        onClick={() => selectOption(option)}
                        onMouseEnter={() => {
                          if (!option.disabled) {
                            setActiveIndex(index);
                          }
                        }}
                        role="option"
                        type="button"
                      >
                        <span className="min-w-0 truncate">{option.label}</span>
                        {isSelected ? (
                          <CheckIcon className="h-4 w-4 shrink-0 text-current" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export const UNSUPPORTED_PIPE_MATERIALS = new Set([
  "HDPE / Polyethylene",
  "PVC",
  "CPVC",
  "Polypropylene",
  "GRP / FRP",
  "Reinforced Concrete",
  "Prestressed Concrete Cylinder Pipe",
  "Asbestos Cement",
  "Other"
]);

export function SearchableGroupedDropdown({
  value,
  onChange,
  groups,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled = false
}: {
  value: string;
  onChange: (value: string) => void;
  groups: DropdownGroup[];
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  disabled?: boolean;
}) {
  const listboxId = useId();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);

  const allOptions = useMemo(
    () =>
      groups.flatMap((group) =>
        group.options.map((option) => ({ group: group.label, value: option }))
      ),
    [groups]
  );

  const filteredGroups = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return groups.map((group) => ({
      ...group,
      options: normalizedSearch
        ? group.options.filter((option) => option.toLowerCase().includes(normalizedSearch))
        : group.options
    })).filter((group) => group.options.length > 0);
  }, [groups, search]);

  const filteredOptions = useMemo(
    () =>
      filteredGroups.flatMap((group) =>
        group.options.map((option) => ({ group: group.label, value: option }))
      ),
    [filteredGroups]
  );

  function updateMenuPosition() {
    const button = buttonRef.current;

    if (!button) {
      return;
    }

    setMenuPosition(getDropdownMenuPosition(button));
  }

  function closeDropdown() {
    setIsOpen(false);
    setSearch("");
  }

  function openDropdown() {
    if (!disabled) {
      setIsOpen(true);
    }
  }

  function toggleDropdown() {
    if (disabled) {
      return;
    }

    if (isOpen) {
      closeDropdown();
      return;
    }

    openDropdown();
  }

  function selectOption(nextValue: string) {
    onChange(nextValue);
    closeDropdown();
    window.requestAnimationFrame(() => buttonRef.current?.focus());
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updateMenuPosition();
    const selectedIndex = filteredOptions.findIndex((option) => option.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    window.requestAnimationFrame(() => searchRef.current?.focus());

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
  }, [filteredOptions, isOpen, value]);

  useEffect(() => {
    setActiveIndex((current) => {
      if (filteredOptions.length === 0) {
        return 0;
      }

      return Math.min(current, filteredOptions.length - 1);
    });
  }, [filteredOptions.length]);

  useEffect(() => {
    if (disabled) {
      closeDropdown();
    }
  }, [disabled]);

  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDropdown();
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
      buttonRef.current?.focus();
      return;
    }

    if (event.key === "Tab") {
      closeDropdown();
      return;
    }

    if (filteredOptions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % filteredOptions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + filteredOptions.length) % filteredOptions.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      selectOption(filteredOptions[activeIndex].value);
    }
  }

  const selectedLabel = allOptions.find((option) => option.value === value)?.value ?? value;

  return (
    <>
      <button
        ref={buttonRef}
        aria-controls={isOpen ? listboxId : undefined}
        aria-disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`${DROPDOWN_TRIGGER_CLASSES} ${
          disabled ? "cursor-not-allowed text-slate-400 opacity-80" : "text-slate-900"
        }`}
        disabled={disabled}
        onClick={toggleDropdown}
        onKeyDown={handleButtonKeyDown}
        role="combobox"
        type="button"
      >
        <span className={selectedLabel ? "truncate" : "truncate text-slate-400"}>
          {selectedLabel || placeholder}
        </span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      {isOpen && menuPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className={DROPDOWN_PANEL_CLASSES}
              id={listboxId}
              onKeyDown={handleMenuKeyDown}
              role="listbox"
              style={{
                left: menuPosition.left,
                maxHeight: menuPosition.maxHeight,
                position: "fixed",
                top: menuPosition.top,
                width: menuPosition.width
              }}
              tabIndex={-1}
            >
              <div className="border-b border-slate-100 bg-white p-3">
                <input
                  ref={searchRef}
                  aria-label={searchPlaceholder}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={searchPlaceholder}
                  type="search"
                  value={search}
                />
              </div>

              <div
                className="overflow-y-auto overflow-x-hidden p-2"
                style={{ maxHeight: Math.max(96, menuPosition.maxHeight - 73) }}
              >
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-slate-500">
                    {emptyMessage}
                  </div>
                ) : (
                  filteredGroups.map((group) => (
                    <div key={group.label} className="py-1">
                      <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {group.label}
                      </div>
                      <div className="space-y-1">
                        {group.options.map((option) => {
                          const optionIndex = filteredOptions.findIndex(
                            (item) => item.group === group.label && item.value === option
                          );
                          const isSelected = option === value;
                          const isActive = optionIndex === activeIndex;

                          return (
                            <button
                              key={option}
                              aria-selected={isSelected}
                              className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                                isSelected
                                  ? "bg-cyan-600 text-white"
                                  : isActive
                                    ? "bg-cyan-50 text-slate-900"
                                    : "text-slate-700 hover:bg-cyan-50"
                              }`}
                              onClick={() => selectOption(option)}
                              onMouseEnter={() => setActiveIndex(optionIndex)}
                              role="option"
                              type="button"
                            >
                              <span className="min-w-0 truncate">{option}</span>
                              {isSelected ? (
                                <CheckIcon
                                  className={`h-4 w-4 shrink-0 ${isSelected ? "text-current" : "text-cyan-600"}`}
                                />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export function PipeMaterialDropdown({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <SearchableGroupedDropdown
      value={value}
      onChange={onChange}
      groups={getPipeMaterialGroups()}
      placeholder="Select pipe material"
      searchPlaceholder="Search pipe material..."
      emptyMessage="No material found"
    />
  );
}

export function PipeGradeDropdown({
  material,
  value,
  onChange
}: {
  material: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const materialOption = getPipeMaterialOption(material);
  const gradeOptions: PipeGradeOption[] = materialOption?.grades ?? [];

  return (
    <SearchableGroupedDropdown
      value={value}
      onChange={onChange}
      groups={[
        {
          label: materialOption?.gradeLabel ?? "Pipe Grade",
          options: gradeOptions.map((option) => option.label)
        }
      ]}
      placeholder={materialOption ? `Select ${materialOption.gradeLabel.toLowerCase()}` : "Select pipe material first"}
      searchPlaceholder="Search pipe grade..."
      emptyMessage="No grade found"
      disabled={!materialOption}
    />
  );
}

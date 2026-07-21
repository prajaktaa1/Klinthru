"use client";

import { SearchableGroupedDropdown } from "@/components/pipe-material-dropdown";
import {
  externalCoatingOptions,
  internalCoatingOptions,
  legacyExternalCoatingMap,
  legacyInternalCoatingMap
} from "@/lib/pipe-coating-options";

export function ExternalCoatingDropdown({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <SearchableGroupedDropdown
      value={legacyExternalCoatingMap[value] ?? value}
      onChange={onChange}
      groups={externalCoatingOptions}
      placeholder="Select external coating type"
      searchPlaceholder="Search coating type..."
      emptyMessage="No coating found"
    />
  );
}

export function InternalCoatingDropdown({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <SearchableGroupedDropdown
      value={legacyInternalCoatingMap[value] ?? value}
      onChange={onChange}
      groups={internalCoatingOptions}
      placeholder="Select internal lining type"
      searchPlaceholder="Search lining type..."
      emptyMessage="No coating found"
    />
  );
}

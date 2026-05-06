export const TECH_DEBT_LABEL = "tech_debt";
export const EXCLUDE_TECH_DEBT_LABEL_FILTER = "exclude_tech_debt";
export const AVAILABLE_LABEL_FILTERS = [TECH_DEBT_LABEL, EXCLUDE_TECH_DEBT_LABEL_FILTER] as const;
export const LABEL_FILTER_CHIPS = [TECH_DEBT_LABEL] as const;

export type LabelFilter = (typeof AVAILABLE_LABEL_FILTERS)[number];
export type LabelFilterChip = (typeof LABEL_FILTER_CHIPS)[number];
export type LabelFilterState = "excluded" | "included" | "none";

export const LABEL_FILTER_LABELS: Record<LabelFilter, string> = {
  [EXCLUDE_TECH_DEBT_LABEL_FILTER]: "Without tech_debt",
  [TECH_DEBT_LABEL]: TECH_DEBT_LABEL,
};

interface JiraFilterDetails {
  labels?: string[];
  type?: string;
}

interface IsTaskVisibleOptions {
  details?: JiraFilterDetails;
  labelFilter: string[];
  typeFilter: string[];
}

export function isTaskVisible({ details, labelFilter, typeFilter }: IsTaskVisibleOptions) {
  if (!details) {
    return true;
  }

  if (typeFilter.length > 0 && details.type && !typeFilter.includes(details.type)) {
    return false;
  }

  const activeLabelFilter = labelFilter.filter((label): label is LabelFilter =>
    AVAILABLE_LABEL_FILTERS.includes(label as LabelFilter),
  );

  if (activeLabelFilter.includes(TECH_DEBT_LABEL)) {
    const labels = details.labels ?? [];
    return labels.includes(TECH_DEBT_LABEL);
  }

  if (activeLabelFilter.includes(EXCLUDE_TECH_DEBT_LABEL_FILTER)) {
    const labels = details.labels ?? [];
    return !labels.includes(TECH_DEBT_LABEL);
  }

  return true;
}

export function getLabelFilterState(
  currentFilters: string[],
  filter: LabelFilterChip,
): LabelFilterState {
  if (filter === TECH_DEBT_LABEL) {
    if (currentFilters.includes(TECH_DEBT_LABEL)) {
      return "included";
    }
    if (currentFilters.includes(EXCLUDE_TECH_DEBT_LABEL_FILTER)) {
      return "excluded";
    }
  }

  return "none";
}

export function toggleLabelFilter(currentFilters: string[], filter: string): string[] {
  const currentSupportedFilters = currentFilters.filter(
    (currentFilter): currentFilter is LabelFilter =>
      AVAILABLE_LABEL_FILTERS.includes(currentFilter as LabelFilter),
  );
  if (!LABEL_FILTER_CHIPS.includes(filter as LabelFilterChip)) {
    return currentSupportedFilters;
  }

  const nextFilter = filter as LabelFilterChip;
  if (nextFilter === TECH_DEBT_LABEL) {
    const filtersWithoutTechDebt = currentSupportedFilters.filter(
      (currentFilter) =>
        currentFilter !== TECH_DEBT_LABEL && currentFilter !== EXCLUDE_TECH_DEBT_LABEL_FILTER,
    );
    const currentState = getLabelFilterState(currentSupportedFilters, nextFilter);

    if (currentState === "none") {
      return [...filtersWithoutTechDebt, TECH_DEBT_LABEL];
    }
    if (currentState === "included") {
      return [...filtersWithoutTechDebt, EXCLUDE_TECH_DEBT_LABEL_FILTER];
    }
    return filtersWithoutTechDebt;
  }

  return [...currentSupportedFilters, nextFilter];
}

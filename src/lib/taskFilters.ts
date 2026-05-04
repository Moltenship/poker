export const TECH_DEBT_LABEL = "tech_debt";
export const AVAILABLE_LABEL_FILTERS = [TECH_DEBT_LABEL] as const;

export type LabelFilter = (typeof AVAILABLE_LABEL_FILTERS)[number];

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

  if (activeLabelFilter.length > 0) {
    const labels = details.labels ?? [];
    return activeLabelFilter.some((label) => labels.includes(label));
  }

  return true;
}

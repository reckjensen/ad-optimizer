import { addDays, format, parseISO, subDays } from "date-fns";

export type DateRange = {
  start: string; // inclusive YYYY-MM-DD
  end: string; // inclusive YYYY-MM-DD
};

export type ComparisonWindows = {
  current: DateRange;
  previous: DateRange;
  label: "dod" | "7d" | "28d";
};

/** Inclusive day count between two YYYY-MM-DD dates. */
export function daysInclusive(start: string, end: string): number {
  const a = parseISO(start);
  const b = parseISO(end);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

export function shiftRange(range: DateRange, days: number): DateRange {
  return {
    start: format(addDays(parseISO(range.start), days), "yyyy-MM-dd"),
    end: format(addDays(parseISO(range.end), days), "yyyy-MM-dd"),
  };
}

export function formatRange(range: DateRange): string {
  return `${range.start}/${range.end}`;
}

/**
 * Comparison windows relative to an analysis "as of" date (typically yesterday).
 */
export function getComparisonWindows(asOfDate: string): ComparisonWindows[] {
  const asOf = parseISO(asOfDate);

  const dodCurrent: DateRange = {
    start: asOfDate,
    end: asOfDate,
  };
  const dodPrevious: DateRange = {
    start: format(subDays(asOf, 1), "yyyy-MM-dd"),
    end: format(subDays(asOf, 1), "yyyy-MM-dd"),
  };

  const sevenCurrent: DateRange = {
    start: format(subDays(asOf, 6), "yyyy-MM-dd"),
    end: asOfDate,
  };
  const sevenPrevious = shiftRange(sevenCurrent, -7);

  const twentyEightCurrent: DateRange = {
    start: format(subDays(asOf, 27), "yyyy-MM-dd"),
    end: asOfDate,
  };
  const twentyEightPrevious = shiftRange(twentyEightCurrent, -28);

  return [
    { current: dodCurrent, previous: dodPrevious, label: "dod" },
    { current: sevenCurrent, previous: sevenPrevious, label: "7d" },
    {
      current: twentyEightCurrent,
      previous: twentyEightPrevious,
      label: "28d",
    },
  ];
}

export function inRange(date: string, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

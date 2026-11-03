import { daysBetween } from "./calculation";
interface ShiftTimes {
  startMinute: number;
  endMinute: number;
  weekdays: number[];
}
interface ExistingAssignment {
  from: Date;
  to: Date;
  shift: ShiftTimes;
}
function intervals(days: string[], shift: ShiftTimes) {
  return days
    .filter((d) =>
      shift.weekdays.includes(new Date(`${d}T00:00:00Z`).getUTCDay()),
    )
    .map((d) => {
      const midnight = +new Date(`${d}T00:00:00Z`);
      return [
        midnight + shift.startMinute * 60000,
        midnight +
          (shift.endMinute +
            (shift.endMinute <= shift.startMinute ? 1440 : 0)) *
            60000,
      ] as const;
    });
}
export function hasScheduleConflict(
  days: string[],
  shift: ShiftTimes,
  existing: ExistingAssignment[],
): boolean {
  const incoming = intervals(days, shift);
  if (!incoming.length) return false;
  const from = new Date(+new Date(`${days[0]}T00:00:00Z`) - 86400000),
    to = new Date(+new Date(`${days[days.length - 1]}T00:00:00Z`) + 86400000);
  return existing.some((a) => {
    const start = new Date(Math.max(+a.from, +from)),
      end = new Date(Math.min(+a.to, +to));
    if (start > end) return false;
    return intervals(
      daysBetween(
        start.toISOString().slice(0, 10),
        end.toISOString().slice(0, 10),
        368,
      ),
      a.shift,
    ).some(([begin, finish]) =>
      incoming.some(([a, b]) => begin < b && finish > a),
    );
  });
}

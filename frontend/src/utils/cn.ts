export type ClassValue = string | number | null | false | undefined | ClassValue[];

const flatten = (value: ClassValue, out: string[]): void => {
  if (!value && value !== 0) return;
  if (Array.isArray(value)) {
    value.forEach((item) => flatten(item, out));
    return;
  }
  out.push(String(value));
};

export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  values.forEach((value) => flatten(value, out));
  return out.join(' ');
}

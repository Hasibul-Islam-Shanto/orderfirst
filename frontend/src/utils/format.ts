export const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );
export const localDate = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const dateLabel = (date: string) =>
  new Date(date.length === 10 ? `${date}T12:00:00` : date).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );
export const id = (prefix: string) =>
  `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
export const times = [
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
];
export const timeLabel = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

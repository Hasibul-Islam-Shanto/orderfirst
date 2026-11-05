import { z } from "zod";
import { localDate, times } from "../utils/format";
export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters.").max(100),
});
export const registerSchema = loginSchema.extend({
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(60, "Keep your name under 60 characters."),
});
export const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(60),
  phone: z
    .string()
    .trim()
    .regex(
      /^\+?[\d\s()-]{7,20}$/,
      "Enter a valid phone number (7–20 characters).",
    )
    .refine(
      (value) => value.replace(/\D/g, "").length >= 7,
      "Enter a phone number with at least 7 digits.",
    ),
  type: z.enum(["Dine In", "Pickup"]),
  notes: z.string().max(500, "Keep notes under 500 characters."),
});
export const reservationSchema = z
  .object({
    date: z
      .string()
      .min(1, "Choose a date.")
      .refine(
        (v) => v >= localDate() && v <= localDate(90),
        "Choose a date within the next 90 days.",
      ),
    time: z
      .string()
      .refine((v) => times.includes(v), "Choose an available time."),
    guests: z
      .number()
      .int()
      .min(1)
      .max(8, "We can accommodate up to 8 guests online."),
    tableId: z.string().min(1, "Select a table for your visit."),
    request: z.string().max(500, "Keep requests under 500 characters."),
  })
  .refine((v) => new Date(`${v.date}T${v.time}:00`).getTime() > Date.now(), {
    path: ["time"],
    message: "Choose a time in the future.",
  });
export const menuSchema = z.object({
  name: z.string().trim().min(3, "Use at least 3 characters.").max(80),
  description: z
    .string()
    .trim()
    .min(15, "Describe the dish in at least 15 characters.")
    .max(400),
  categoryId: z.string().min(1, "Choose a category."),
  price: z.number().positive("Price must be greater than zero.").max(999),
  image: z
    .url("Enter a valid image URL.")
    .refine(
      (v) => v.startsWith("https://"),
      "Use a secure https:// image URL.",
    ),
  prepTime: z.number().int().min(1).max(120),
  featured: z.boolean(),
  available: z.boolean(),
  vegetarian: z.boolean(),
});
export const tableSchema = z.object({
  number: z.number().int().min(1).max(99),
  capacity: z.number().int().min(1).max(8),
  available: z.boolean(),
  area: z.string().trim().min(2, "Enter a seating area.").max(40),
});
export const categorySchema = z.object({
  name: z.string().trim().min(2, "Use at least 2 characters.").max(30),
});

export type UserRole = "customer" | "admin";
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  emailVerifiedAt: string | null;
}
export interface Category {
  id: string;
  name: string;
  emoji: string;
}
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  available: boolean;
  featured: boolean;
  prepTime: number;
  rating: number;
  vegetarian: boolean;
}
export interface CartItem {
  item: MenuItem;
  quantity: number;
}
export const orderStatuses = [
  "Pending",
  "Confirmed",
  "Preparing",
  "Ready",
  "Completed",
  "Cancelled",
] as const;
export type OrderStatus = (typeof orderStatuses)[number];
export interface Order {
  id: string;
  userId: string;
  customer: string;
  phone: string;
  items: CartItem[];
  total: number;
  date: string;
  status: OrderStatus;
  type: "Dine In" | "Pickup";
  notes: string;
}
export const reservationStatuses = [
  "Pending",
  "Confirmed",
  "Completed",
  "Cancelled",
] as const;
export type ReservationStatus = (typeof reservationStatuses)[number];
export interface Reservation {
  id: string;
  userId: string;
  customer: string;
  date: string;
  time: string;
  guests: number;
  tableId: string;
  status: ReservationStatus;
  request: string;
  tableNumber?: number;
}
export interface RestaurantTable {
  id: string;
  number: number;
  capacity: number;
  available: boolean;
  area: string;
}

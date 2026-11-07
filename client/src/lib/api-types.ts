import type {
  Category,
  MenuItem,
  Order,
  Reservation,
  RestaurantTable,
  User,
} from "../types";

export interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
}
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination;
}
export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "ADMIN";
  emailVerifiedAt: string | null;
  createdAt?: string;
}
export interface ApiCategory {
  id: string;
  name: string;
  slug: string;
}
export interface ApiMenuItem {
  id: string;
  name: string;
  description: string;
  price: string | number;
  imageUrl: string;
  categoryId: string;
  isAvailable: boolean;
  isFeatured: boolean;
  preparationTimeMinutes: number;
  category?: ApiCategory;
}
export interface ApiTable {
  id: string;
  tableNumber: number;
  capacity: number;
  isAvailable: boolean;
}
export interface ApiOrderItem {
  id: string;
  quantity: number;
  unitPrice: string | number;
  menuItemId?: string;
  menuItemName?: string;
  menuItem?: { id: string; name: string; imageUrl?: string };
}
export interface ApiOrder {
  id: string;
  userId: string;
  customerName?: string;
  customerEmail?: string;
  user?: ApiUser;
  status: string;
  orderType: "DINE_IN" | "PICKUP";
  total: string | number;
  notes: string | null;
  createdAt: string;
  items?: ApiOrderItem[];
}
export interface ApiReservation {
  id: string;
  userId: string;
  customerName?: string;
  customerEmail?: string;
  user?: ApiUser;
  restaurantTableId: string;
  restaurantTable?: ApiTable;
  reservationDate: string;
  guestCount: number;
  specialRequest: string | null;
  status: string;
}

const title = (value?: string) =>
  value
    ? value
        .toLowerCase()
        .replace(
          /(^|_)(\w)/g,
          (_, __, letter: string) => `${_ ? " " : ""}${letter.toUpperCase()}`,
        )
        .trim()
    : "";
export const mapUser = (user: ApiUser): User => ({
  ...user,
  role: user.role.toLowerCase() as User["role"],
});
export const mapCategory = (category: ApiCategory): Category => ({
  id: category.id,
  name: category.name,
  emoji: "🍽️",
});
export const mapMenuItem = (item: ApiMenuItem): MenuItem => ({
  id: item.id,
  name: item.name,
  description: item.description,
  price: Number(item.price),
  image: item.imageUrl,
  categoryId: item.categoryId,
  available: item.isAvailable,
  featured: item.isFeatured,
  prepTime: item.preparationTimeMinutes,
  rating: 4.8,
  vegetarian: false,
});
export const mapTable = (table: ApiTable): RestaurantTable => ({
  id: table.id,
  number: table.tableNumber,
  capacity: table.capacity,
  available: table.isAvailable,
  area: "Dining room",
});
export const mapOrder = (order: ApiOrder): Order => ({
  id: order.id,
  userId: order.userId,
  customer: order.customerName ?? order.user?.name ?? "Guest",
  phone: "",
  items: (order.items ?? []).map((line) => {
    const itemId = line.menuItem?.id ?? line.menuItemId ?? line.id;
    const itemName = line.menuItem?.name ?? line.menuItemName ?? "Menu Item";
    const itemImage = line.menuItem?.imageUrl ?? "";
    return {
      quantity: line.quantity,
      item: {
        id: itemId,
        name: itemName,
        description: "",
        price: Number(line.unitPrice),
        image: itemImage,
        categoryId: "",
        available: true,
        featured: false,
        prepTime: 0,
        rating: 0,
        vegetarian: false,
      },
    };
  }),
  total: Number(order.total),
  date: order.createdAt,
  status: title(order.status) as Order["status"],
  type: title(order.orderType) as Order["type"],
  notes: order.notes ?? "",
});
export const mapReservation = (reservation: ApiReservation): Reservation => {
  const d = new Date(reservation.reservationDate);
  return {
    id: reservation.id,
    userId: reservation.userId,
    customer: reservation.customerName ?? reservation.user?.name ?? "Guest",
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
    guests: reservation.guestCount,
    tableId: reservation.restaurantTableId,
    tableNumber: reservation.restaurantTable?.tableNumber,
    status: title(reservation.status) as Reservation["status"],
    request: reservation.specialRequest ?? "",
  };
};

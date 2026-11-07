const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

// Run the real TypeScript helpers with Node's test runner, without adding a
// frontend test framework or changing the application build configuration.
require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  });
  module._compile(result.outputText, filename);
};
const { checkoutSchema, reservationSchema } = require("../src/lib/schemas.ts");
const {
  resolveCartItems,
} = require("../src/features/cart/resolve-cart-items.ts");
const {
  reservationAuthState,
  readReservationDraft,
} = require("../src/features/reservations/reservation-draft.ts");
const { availableTables } = require("../src/lib/reservation-availability.ts");
const { menuItems } = require("../src/mocks/data.ts");
const { localDate } = require("../src/utils/format.ts");

test("checkout rejects blank, punctuation-only, short, and alphabetic phone numbers", () => {
  for (const phone of [
    "       ",
    "-------",
    "()()()()",
    "123456",
    "+1 (23) 45",
    "555-CALL-NOW",
  ]) {
    const result = checkoutSchema.safeParse({
      name: "Alex Morgan",
      phone,
      type: "Pickup",
      notes: "",
    });
    assert.equal(result.success, false, phone);
    assert.ok(result.error.issues.some((issue) => issue.path[0] === "phone"));
  }
});
test("checkout accepts formatted phone numbers and trims outer whitespace", () => {
  for (const phone of ["5551234", "+1 (555) 123-4567", "+880 1712-345678"]) {
    const result = checkoutSchema.parse({
      name: "Alex Morgan",
      phone: `  ${phone}  `,
      type: "Dine In",
      notes: "",
    });
    assert.equal(result.phone, phone);
  }
});
test("reservation draft survives serialized login/registration navigation", () => {
  const draft = {
    date: localDate(4),
    time: "18:30",
    guests: 4,
    tableId: "t3",
    request: "An anniversary dinner, please.",
  };
  const loginState = JSON.parse(JSON.stringify(reservationAuthState(draft)));
  const registrationState = JSON.parse(JSON.stringify(loginState));
  assert.equal(registrationState.from, "/reservations/new");
  assert.deepEqual(readReservationDraft(registrationState), draft);
  assert.equal(
    reservationSchema.safeParse(readReservationDraft(registrationState))
      .success,
    true,
  );
});
test("incomplete and expired drafts remain editable, but cannot be submitted", () => {
  const draft = {
    date: localDate(-1),
    time: "18:30",
    guests: 4,
    tableId: "",
    request: "Window, please.",
  };
  const restored = readReservationDraft(reservationAuthState(draft));
  assert.deepEqual(restored, draft);
  assert.equal(reservationSchema.safeParse(restored).success, false);
  assert.equal(readReservationDraft(null), undefined);
  assert.equal(
    readReservationDraft({ reservationDraft: { guests: "four" } }),
    undefined,
  );
});
test("restoring a draft does not bypass a table booked during sign-in", () => {
  const draft = {
    date: localDate(4),
    time: "18:30",
    guests: 4,
    tableId: "t3",
    request: "",
  };
  const restored = readReservationDraft(reservationAuthState(draft));
  const tables = [
    { id: "t3", number: 3, capacity: 4, available: true, area: "Main dining" },
  ];
  const reservations = [
    {
      ...draft,
      id: "other",
      userId: "other",
      customer: "Another guest",
      status: "Confirmed",
    },
  ];
  assert.deepEqual(
    availableTables(
      tables,
      reservations,
      restored.date,
      restored.time,
      restored.guests,
    ),
    [],
  );
});
test("saved carts use updated menu prices without changing historical snapshots", () => {
  const original = { ...menuItems[0], price: 14 };
  const saved = JSON.parse(JSON.stringify([{ item: original, quantity: 2 }]));
  const menu = [{ ...original, price: 19.5 }];
  const cart = resolveCartItems(saved, menu);
  const checkout = resolveCartItems(saved, menu);
  const total = (items) =>
    items.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  assert.equal(total(cart), 39);
  assert.equal(total(checkout), total(cart));
  assert.equal(saved[0].item.price, 14);
  assert.equal(original.price, 14);
});
test("deleted and disabled cart dishes remain removable but unavailable", () => {
  const item = menuItems[0];
  assert.equal(
    resolveCartItems([{ item, quantity: 2 }], [])[0].item.available,
    false,
  );
  assert.equal(
    resolveCartItems(
      [{ item, quantity: 2 }],
      [{ ...item, available: false }],
    )[0].item.available,
    false,
  );
});
test("muted text meets 4.5:1 contrast on all semantic surfaces in both themes", () => {
  const css = fs.readFileSync(
    path.join(__dirname, "../src/globals.css"),
    "utf8",
  );
  const luminance = (hex) => {
    const raw = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
    return raw
      .match(/.{2}/g)
      .map((s) => parseInt(s, 16) / 255)
      .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
      .reduce((sum, x, index) => sum + x * [0.2126, 0.7152, 0.0722][index], 0);
  };
  for (const selector of [":root {", ':root[data-theme="dark"] {']) {
    const block = css.slice(css.indexOf(selector)).split("}")[0];
    const color = (name) =>
      block.match(new RegExp(`--${name}: #([a-f0-9]+);`))[1];
    for (const surface of ["bg", "surface", "surface-alt", "green-soft"]) {
      const values = [
        luminance(color("muted")),
        luminance(color(surface)),
      ].sort((a, b) => a - b);
      const contrast = (values[1] + 0.05) / (values[0] + 0.05);
      assert.ok(contrast >= 4.5, `${selector} ${surface}: ${contrast}`);
    }
  }
});

test("mapOrder handles backend order items without nested menuItem object", () => {
  const { mapOrder } = require("../src/lib/api-types.ts");
  const backendOrder = {
    id: "11111111-1111-4111-8111-111111111111",
    userId: "22222222-2222-4222-8222-222222222222",
    customerName: "Shanto",
    status: "PENDING",
    orderType: "PICKUP",
    total: "129.00",
    notes: "Okay bro.",
    createdAt: "2026-11-07T11:00:00.000Z",
    items: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        menuItemId: "44444444-4444-4444-8444-444444444444",
        menuItemName: "Combo Burger",
        quantity: 1,
        unitPrice: "129.00",
      },
    ],
  };

  const mapped = mapOrder(backendOrder);
  assert.equal(mapped.id, "11111111-1111-4111-8111-111111111111");
  assert.equal(mapped.customer, "Shanto");
  assert.equal(mapped.status, "Pending");
  assert.equal(mapped.type, "Pickup");
  assert.equal(mapped.total, 129);
  assert.equal(mapped.items.length, 1);
  assert.equal(mapped.items[0].quantity, 1);
  assert.equal(mapped.items[0].item.id, "44444444-4444-4444-8444-444444444444");
  assert.equal(mapped.items[0].item.name, "Combo Burger");
  assert.equal(mapped.items[0].item.price, 129);
});

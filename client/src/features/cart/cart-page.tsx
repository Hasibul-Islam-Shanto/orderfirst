import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Trash2, Clock } from "lucide-react";
import { useMenuItems } from "../menu/menu-hooks";
import { resolveCartItems } from "./resolve-cart-items";
import { useCart } from "../../store/cart-store";
import {
  PageHeader,
  EmptyState,
  Quantity,
  useToast,
  Image,
} from "../../components/common/ui";
import { money } from "../../utils/format";
import type { CartItem } from "../../types";
export function OrderSummary({
  items,
  children,
}: {
  items: CartItem[];
  children?: React.ReactNode;
}) {
  const total = items.reduce((n, i) => n + i.item.price * i.quantity, 0);
  return (
    <aside className="panel order-summary">
      <h2>Your order, at a glance.</h2>
      {items.map((i) => (
        <div className="summary-line" key={i.item.id}>
          <span>
            {i.quantity} × {i.item.name}
          </span>
          <strong>{money(i.item.price * i.quantity)}</strong>
        </div>
      ))}
      <div className="summary-divider" />
      <div className="summary-line muted">
        <span>Subtotal</span>
        <span>{money(total)}</span>
      </div>
      <div className="summary-line muted">
        <span>Additional fees</span>
        <span>{money(0)}</span>
      </div>
      <div className="summary-line total">
        <span>Total</span>
        <strong>{money(total)}</strong>
      </div>
      {children}
      <p className="summary-note">
        <Clock size={15} /> Freshly prepared in about 20–35 minutes
      </p>
    </aside>
  );
}
export function CartPage() {
  const { items: savedItems, update, remove } = useCart();
  const menu = useMenuItems({ limit: 100 });
  const items = resolveCartItems(savedItems, menu.data?.pages.flatMap((page) => page.data) ?? []);
  const toast = useToast();
  return (
    <div className="shell page">
      <PageHeader
        eyebrow="SOMETHING GOOD IS ON THE WAY"
        title="Your cravings, collected."
        description="A quick look before we get cooking."
      />
      {items.length ? (
        <div className="two-column">
          <div>
            <div className="panel cart-list">
              {items.map(({ item, quantity }) => (
                <article className="cart-item" key={item.id}>
                  <Image src={item.image} alt={item.name} />
                  <div className="cart-item-info">
                    <Link to={`/menu/${item.id}`}>
                      <h3>{item.name}</h3>
                    </Link>
                    <p className="muted">{money(item.price)} each</p>
                    {!item.available && (
                      <p className="field-error">
                        No longer available. Please remove this dish.
                      </p>
                    )}
                    <Quantity
                      value={quantity}
                      name={item.name}
                      onChange={(n) => update(item.id, n)}
                    />
                  </div>
                  <div className="cart-item-end">
                    <strong>{money(item.price * quantity)}</strong>
                    <button
                      className="icon-button"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => {
                        remove(item.id);
                        toast(`${item.name} removed`);
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <Link className="text-link" to="/menu">
              <ArrowLeft size={17} /> A little something else? Keep browsing
            </Link>
          </div>
          <OrderSummary items={items}>
            <Link className="button full" to="/checkout">
              Continue to checkout <ArrowRight size={18} />
            </Link>
          </OrderSummary>
        </div>
      ) : (
        <EmptyState
          title="A good meal starts with a little browsing."
          description="Your cart is empty. Let’s find you something delicious."
          action={
            <Link className="button" to="/menu">
              Explore the menu <ArrowRight size={18} />
            </Link>
          }
        />
      )}
    </div>
  );
}

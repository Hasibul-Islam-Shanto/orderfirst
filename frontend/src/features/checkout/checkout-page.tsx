import { Link, useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Utensils, ShoppingBag, ArrowRight, ShieldCheck } from "lucide-react";
import { checkoutSchema } from "../../lib/schemas";
import { useCurrentUser } from "../auth/auth-hooks";
import { useCart } from "../../store/cart-store";
import { useMenuItems } from "../menu/menu-hooks";
import { useCreateOrder } from "../orders/order-hooks";
import { ApiError } from "../../lib/api-client";
import { Field, errorProps } from "../../components/forms/form-field";
import { PageHeader, EmptyState, useToast } from "../../components/common/ui";
import { resolveCartItems } from "../cart/resolve-cart-items";
import { OrderSummary } from "../cart/cart-page";
type Values = z.infer<typeof checkoutSchema>;
export function CheckoutPage() {
  const { data: user } = useCurrentUser();
  const cart = useCart();
  const menu = useMenuItems({ limit: 100 });
  const createOrder = useCreateOrder();
  const navigate = useNavigate();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { name: user?.name ?? "", phone: "", type: "Pickup", notes: "" },
  });
  const type = useWatch({ control, name: "type" });
  const currentItems = resolveCartItems(cart.items, menu.data?.pages.flatMap((page) => page.data) ?? []);
  const submit = async (values: Values) => {
    const unavailable = currentItems.find((i) => !i.item.available);
    if (unavailable) {
      setError("root", {
        message: `${unavailable.item.name} is no longer available. Please remove it from your cart.`,
      });
      return;
    }
    try {
      const order = await createOrder.mutateAsync({ orderType: values.type === "Dine In" ? "DINE_IN" : "PICKUP", notes: values.notes || undefined, items: currentItems.map(({ item, quantity }) => ({ menuItemId: item.id, quantity })) });
      cart.clear();
      toast("Your order is in. Let’s get cooking!");
      navigate(`/order-confirmation/${order.id}`);
    } catch (error) {
      setError("root", { message: error instanceof ApiError ? error.message : "We couldn't place your order. Please try again." });
    }
  };
  if (!cart.items.length)
    return (
      <EmptyState
        title="Your cart is waiting for something good."
        description="Add a dish before heading to checkout."
        action={
          <Link className="button" to="/menu">
            Browse menu
          </Link>
        }
      />
    );
  return (
    <div className="shell page">
      <PageHeader
        eyebrow="THE LAST LITTLE DETAILS"
        title="Let’s make it a meal."
        description="Tell us how you’d like to enjoy your order."
      />
      <form className="two-column" noValidate onSubmit={handleSubmit(submit)}>
        <div className="panel form-panel">
          <h2>How are you joining us?</h2>
          <div className="choice-grid">
            {(["Pickup", "Dine In"] as const).map((t) => (
              <label
                key={t}
                className={`choice-card ${type === t ? "selected" : ""}`}
              >
                <input type="radio" value={t} {...register("type")} />
                {t === "Pickup" ? <ShoppingBag /> : <Utensils />}
                <strong>{t}</strong>
                <span>
                  {t === "Pickup"
                    ? "Ready to grab and go"
                    : "Enjoy it at our place"}
                </span>
              </label>
            ))}
          </div>
          <h2>Your details</h2>
          <Field id="name" label="Full name" error={errors.name?.message}>
            <input
              id="name"
              autoComplete="name"
              {...register("name")}
              {...errorProps("name", errors.name?.message)}
            />
          </Field>
          <Field id="phone" label="Phone number" error={errors.phone?.message}>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+1 (555) 123-4567"
              {...register("phone")}
              {...errorProps("phone", errors.phone?.message)}
            />
          </Field>
          <Field
            id="notes"
            label="Anything we should know? (optional)"
            error={errors.notes?.message}
          >
            <textarea
              id="notes"
              rows={3}
              placeholder="Allergies, preferences, or a little extra sauce…"
              {...register("notes")}
              {...errorProps("notes", errors.notes?.message)}
            />
          </Field>
          <div className="info-box">
            <ShieldCheck size={21} />
            <div>
              <strong>Pay when you arrive</strong>
              <p>Your total is verified by the kitchen. Payment is collected on arrival.</p>
            </div>
          </div>
          {errors.root && (
            <p className="field-error" role="alert">
              {errors.root.message} <Link to="/cart">Edit cart</Link>
            </p>
          )}
        </div>
        <OrderSummary items={currentItems}>
          <button className="button full" disabled={isSubmitting}>
            {isSubmitting ? "Sending to the kitchen…" : "Place order"}
            <ArrowRight size={18} />
          </button>
        </OrderSummary>
      </form>
    </div>
  );
}

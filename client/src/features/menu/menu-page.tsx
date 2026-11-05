import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, Star, Leaf, ShoppingBag } from "lucide-react";
import { useMenuCategories, useMenuItem, useMenuItems } from "./menu-hooks";
import { useDebouncedValue } from "../../lib/use-debounced-value";
import { useCart } from "../../store/cart-store";
import {
  PageHeader,
  SearchInput,
  EmptyState,
  Quantity,
  useToast,
  Image,
} from "../../components/common/ui";
import { MenuCard } from "./menu-card";
import { money } from "../../utils/format";
export function MenuPage() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "all";
  const search = params.get("search") ?? "";
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedValue(searchInput);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("featured");
  const add = useCart((s) => s.add);
  const toast = useToast();
  useEffect(() => { setParams((current) => { const next = new URLSearchParams(current); if (debouncedSearch) next.set("search", debouncedSearch); else next.delete("search"); return next; }, { replace: true }); }, [debouncedSearch, setParams]);
  const categories = useMenuCategories();
  const menu = useMenuItems({ search: debouncedSearch || undefined, category: category === "all" ? undefined : category, available: filter === "available" ? true : undefined });
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = menu;
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => { const node = sentinel.current; if (!node) return; const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); }, { rootMargin: "200px" }); observer.observe(node); return () => observer.disconnect(); }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const items = useMemo(() => (menu.data?.pages.flatMap((page) => page.data) ?? [])
    .filter((i) => filter !== "vegetarian" || i.vegetarian)
    .sort((a, b) =>
      sort === "low"
        ? a.price - b.price
        : sort === "high"
          ? b.price - a.price
          : Number(b.featured) - Number(a.featured)), [menu.data, filter, sort]);
  return (
    <div className="shell page">
      <PageHeader
        eyebrow="FRESH FROM OUR KITCHEN"
        title="Find your next favorite."
        description="Seasonal plates, familiar comforts, and a little something new."
      />
      <div className="menu-toolbar">
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search dishes, ingredients..."
        />
        <select
          aria-label="Diet and availability filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All dishes</option>
          <option value="vegetarian">Vegetarian</option>
          <option value="available">Available now</option>
        </select>
        <select
          aria-label="Sort menu"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="featured">Our favorites first</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
        </select>
      </div>
      <div className="category-tabs" aria-label="Menu categories">
        <button
          className={category === "all" ? "active" : ""}
          onClick={() => setParams({})}
        >
          All dishes
        </button>
        {(categories.data ?? []).map((c) => (
          <button
            className={category === c.id ? "active" : ""}
            key={c.id}
            onClick={() => setParams((p) => { const next = new URLSearchParams(p); next.set("category", c.id); return next; })}
          >
            {c.emoji} {c.name}
          </button>
        ))}
      </div>
      <div className="results-label">
        <span>{items.length} dishes, made with care</span>
        <span>
          <Leaf size={14} /> Vegetarian options
        </span>
      </div>
      {menu.isPending ? <div className="menu-grid" aria-live="polite"><p className="muted">Loading the menu…</p></div> : menu.isError ? (
        <EmptyState title="Unable to load menu." description="Please try again." action={<button className="button secondary" onClick={() => menu.refetch()}>Try again</button>} />
      ) : items.length ? (
        <div className="menu-grid">
          {items.map((item) => (
            <MenuCard
              item={item}
              key={item.id}
              onAdd={(i) => {
                add(i);
                toast(`${i.name} added to your cart`);
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nothing on the menu matches just yet."
          description="Try another ingredient or clear your filters."
          action={
            <button
              className="button secondary"
              onClick={() => {
                setSearchInput("");
                setFilter("all");
                setParams({});
              }}
            >
              Clear filters
            </button>
          }
        />
      )}
      <div ref={sentinel} aria-live="polite" className="results-label">
        {menu.isFetchingNextPage ? <span>Loading more dishes…</span> : menu.hasNextPage ? <button className="button secondary" onClick={() => menu.fetchNextPage()}>Load more</button> : items.length ? <span>You’ve reached the end of the menu.</span> : null}
      </div>
    </div>
  );
}
export function MenuDetail() {
  const { menuItemId } = useParams();
  const itemQuery = useMenuItem(menuItemId);
  const categories = useMenuCategories();
  const item = itemQuery.data;
  const [quantity, setQuantity] = useState(1);
  const add = useCart((s) => s.add);
  const toast = useToast();
  if (itemQuery.isPending) return <div className="shell page" aria-live="polite">Loading dish…</div>;
  if (!item)
    return (
      <EmptyState
        title="Dish not found"
        description="This dish may have left our seasonal menu."
        action={
          <Link className="button" to="/menu">
            Back to menu
          </Link>
        }
      />
    );
  return (
    <div className="shell page">
      <Link className="text-link" to="/menu">
        <ArrowLeft size={17} /> Back to our menu
      </Link>
      <div className="detail-grid">
        <Image className="detail-image" src={item.image} alt={item.name} />
        <div>
          <p className="eyebrow">
            {categories.data?.find((c) => c.id === item.categoryId)?.name}
          </p>
          <h1>{item.name}</h1>
          <div className="detail-meta">
            <span>
              <Star size={17} className="star" /> {item.rating} guest rating
            </span>
            <span>
              <Clock size={17} /> {item.prepTime}–{item.prepTime + 5} minutes
            </span>
          </div>
          <p className="detail-description muted">{item.description}</p>
          {item.vegetarian && (
            <span className="badge">
              <Leaf size={14} /> Vegetarian
            </span>
          )}
          <h2 className="detail-price">{money(item.price)}</h2>
          <p className="muted small-text">
            Made fresh to order. Please mention any allergies at checkout.
          </p>
          <div className="detail-actions">
            <Quantity
              name={item.name}
              value={quantity}
              onChange={setQuantity}
            />
            <button
              className="button"
              disabled={!item.available}
              onClick={() => {
                add(item, quantity);
                toast(`${quantity} × ${item.name} added to your cart`);
              }}
            >
              <ShoppingBag size={18} />
              {item.available
                ? `Add to cart · ${money(item.price * quantity)}`
                : "Currently unavailable"}
            </button>
          </div>
          <Link className="text-link" to="/cart">
            View your cart →
          </Link>
        </div>
      </div>
    </div>
  );
}

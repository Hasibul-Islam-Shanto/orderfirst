import { Link } from "react-router-dom";
import { Plus, Clock, Star, Leaf } from "lucide-react";
import type { MenuItem } from "../../types";
import { money } from "../../utils/format";
import { Image } from "../../components/common/ui";
export function MenuCard({
  item,
  onAdd,
}: {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}) {
  return (
    <article className={`menu-card ${!item.available ? "unavailable" : ""}`}>
      <Link to={`/menu/${item.id}`} className="dish-image">
        <Image src={item.image} alt={item.name} loading="lazy" />
        {item.featured && <span className="dish-label">House favorite</span>}
        {!item.available && <span className="dish-label">Back soon</span>}
        <span className="image-arrow" aria-hidden>
          ↗
        </span>
      </Link>
      <div className="dish-content">
        <div className="dish-title">
          <Link to={`/menu/${item.id}`}>
            <h3>{item.name}</h3>
          </Link>
          {item.vegetarian && (
            <Leaf size={16} className="leaf" aria-label="Vegetarian" />
          )}
        </div>
        <p>{item.description}</p>
        <div className="dish-meta">
          <span>
            <Star size={13} className="star" fill="currentColor" />{" "}
            {item.rating}
          </span>
          <span>
            <Clock size={13} /> {item.prepTime}–{item.prepTime + 5} min
          </span>
        </div>
        <div className="dish-bottom">
          <strong>{money(item.price)}</strong>
          <button
            className="add-button"
            onClick={() => onAdd(item)}
            disabled={!item.available}
            aria-label={`Add ${item.name} to cart`}
          >
            <Plus size={17} />
            <span>Add</span>
          </button>
        </div>
      </div>
    </article>
  );
}

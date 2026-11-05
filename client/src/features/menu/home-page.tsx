import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Leaf,
  ChefHat,
  Clock,
  CalendarDays,
  Utensils,
  Heart,
} from "lucide-react";
import { useMenuCategories, useMenuItems } from "./menu-hooks";
import { useCart } from "../../store/cart-store";
import { useToast, Image } from "../../components/common/ui";
import { MenuCard } from "./menu-card";
import { photo } from "../../mocks/data";
export function HomePage() {
  const categories = useMenuCategories();
  const featured = useMenuItems({ featured: true, limit: 4 });
  const categoryItems = categories.data ?? [];
  const featuredItems = featured.data?.pages.flatMap((page) => page.data) ?? [];
  const add = useCart((s) => s.add);
  const toast = useToast();
  return (
    <>
      <section className="hero shell">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="small-line" /> A GOOD MEAL CHANGES EVERYTHING
          </div>
          <h1>
            Good food.
            <br />
            Great moments.
            <br />
            <em>Yours to enjoy.</em>
          </h1>
          <p>
            Fresh ingredients. Thoughtful flavors. Whether you’re
            <br className="desktop-break" /> grabbing a favorite or gathering
            around a table,
            <br className="desktop-break" /> we’ll make it worth savoring.
          </p>
          <div className="hero-buttons">
            <Link className="button" to="/menu">
              Order now <ArrowUpRight size={19} />
            </Link>
            <Link className="button secondary" to="/reservations/new">
              <CalendarDays size={18} /> Reserve a table
            </Link>
          </div>
          <div className="hero-social">
            <div className="avatars">
              {[
                "photo-1500648767791-00dcc994a43e",
                "photo-1494790108377-be9c29b29330",
                "photo-1506794778202-cad84cf45f1d",
              ].map((p) => (
                <img key={p} src={photo(p, 80)} alt="" />
              ))}
            </div>
            <div>
              <div className="review-stars">
                ★★★★★ <strong>4.9</strong>
              </div>
              <span>Loved by 2,000+ happy food lovers</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <img
            className="hero-photo"
            src={photo("photo-1547592180-85f173990554", 1400)}
            alt="A vibrant freshly prepared bowl with seasonal greens and vegetables"
            fetchPriority="high"
          />
          <div className="hero-image-shade" />
          <div className="hero-stamp">
            <Leaf size={23} />
            <span>FRESH & LOCAL</span>
            <strong>
              Made with
              <br />
              the good stuff.
            </strong>
          </div>
          <div className="hero-photo-caption">
            <span>FROM OUR KITCHEN, WITH LOVE</span>
            <p>
              A little fresh.
              <br />A lot of flavor.
            </p>
          </div>
          <div className="hero-floating">
            <span className="floating-icon">
              <ChefHat size={24} />
            </span>
            <div>
              <strong>Crafted, never rushed.</strong>
              <span>Made fresh. Every single order.</span>
            </div>
            <span className="floating-dot" />
          </div>
        </div>
      </section>
      <div className="promise-strip">
        <div className="shell">
          <span>
            <Leaf size={18} /> Fresh, seasonal ingredients
          </span>
          <span>
            <ChefHat size={18} /> Made with care
          </span>
          <span>
            <Clock size={18} /> Ready when you are
          </span>
          <span>
            <Heart size={18} /> A place for everyone
          </span>
        </div>
      </div>
      <section className="shell section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FOLLOW YOUR CRAVINGS</p>
            <h2>What sounds good?</h2>
          </div>
          <p className="muted">A little something for every kind of hungry.</p>
        </div>
        <div className="category-grid">
          {categoryItems.map((c) => (
            <Link
              className="category-card"
              key={c.id}
              to={`/menu?category=${c.id}`}
            >
              <span>{c.emoji}</span>
              <strong>{c.name}</strong>
              <ArrowUpRight size={15} />
            </Link>
          ))}
        </div>
      </section>
      <section className="featured-section">
        <div className="shell section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">TRIED, TASTED, LOVED</p>
              <h2>The usual favorites.</h2>
              <p className="muted">
                The dishes our guests come back for. And back again.
              </p>
            </div>
            <Link className="text-link" to="/menu">
              Explore the full menu <ArrowRight size={18} />
            </Link>
          </div>
          <div className="menu-grid">
            {featuredItems.map((item) => (
                <MenuCard
                  key={item.id}
                  item={item}
                  onAdd={(i) => {
                    add(i);
                    toast(`${i.name} added to your cart`);
                  }}
                />
              ))}
          </div>
        </div>
      </section>
      <section className="shell section story-section" id="our-story">
        <div className="story-image">
          <Image
            src={photo("photo-1414235077428-338989a2e8c0")}
            alt="A warmly lit dining room ready for an evening gathering"
            loading="lazy"
          />
          <span>A SEAT AT OUR TABLE</span>
        </div>
        <div className="story-copy">
          <p className="eyebrow">MORE THAN A MEAL</p>
          <h2>
            Good things happen
            <br />
            around a table.
          </h2>
          <p className="muted">
            The catch-ups that run a little longer. The celebrations big and
            small. The “let’s do this again” kind of evenings. There’s a place
            for all of them here.
          </p>
          <div className="story-features">
            <span>
              <Utensils size={19} /> Food made from the heart
            </span>
            <span>
              <Leaf size={19} /> Ingredients close to home
            </span>
            <span>
              <Heart size={19} /> Hospitality that feels like it
            </span>
          </div>
          <Link className="button secondary" to="/reservations/new">
            Find your seat <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <section className="testimonial">
        <div className="shell">
          <div className="review-stars">★★★★★</div>
          <blockquote>
            “The kind of place that turns a regular Tuesday
            <br />
            into a really good memory.”
          </blockquote>
          <p>
            Olivia R. <span>· A happy regular</span>
          </p>
        </div>
      </section>
      <section className="shell section">
        <div className="reservation-banner">
          <div>
            <p className="eyebrow">WE’LL SAVE YOU A SEAT</p>
            <h2>Your table is waiting.</h2>
            <p>Bring your favorite people. We’ll take care of the rest.</p>
          </div>
          <Link className="button cream" to="/reservations/new">
            Reserve a table <ArrowUpRight size={19} />
          </Link>
          <span className="banner-decoration" aria-hidden>
            ✳
          </span>
        </div>
      </section>
    </>
  );
}

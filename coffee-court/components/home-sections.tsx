"use client";
import { useState } from "react";
import { productImage } from "../lib/product-details";
import {
  Coffee,
  Leaf,
  Plus,
  ArrowRight,
  MapPin,
  Clock,
  Trophy,
  ShoppingBag,
} from "lucide-react";
import {
  productVisible,
  priceLabel,
  available,
  type State,
  type Product,
} from "../lib/domain";
const groups = ["All", "Coffee", "Cold Coffee", "Food", "Bites"];
const belongs = (p: Product, g: string) =>
  g === "All" ||
  (g === "Coffee" && ["Espresso", "Pour Overs"].includes(p.category)) ||
  (g === "Cold Coffee" &&
    ["Cold Coffee", "Cold Brew", "Iced Coffee"].includes(p.category)) ||
  (g === "Food" && p.section === "Food") ||
  (g === "Bites" && ["Fries", "Toast"].includes(p.category));
export default function HomeSections({
  data,
  navigate,
  add,
}: {
  data: State;
  navigate: (view: string) => void;
  add: (p: Product) => void;
}) {
  const [group, setGroup] = useState("All");
  const all = data.products.filter((p) => productVisible(p, "website"));
  const featured = [
    "cappuccino",
    "classic-cold-coffee",
    "sandwich",
    "salted-fries",
  ]
    .map((id) => all.find((p) => p.id === id))
    .filter(Boolean) as Product[];
  const rows =
    group === "All"
      ? [
          ...featured,
          ...all.filter((p) => !featured.some((f) => f.id === p.id)),
        ].slice(0, 4)
      : all.filter((p) => belongs(p, group)).slice(0, 4);
  const b = data.settings.business;
  return (
    <div className="home-below-hero">
      <section className="home-menu-showcase" aria-label="Our café menu">
        <div className="home-menu-heading">
          <div>
            <span className="section-kicker">
              OUR MENU
              <i />
            </span>
            <h2>
              Freshly Brewed,
              <br />
              Everyday.
            </h2>
            <p>
              From rich espressos to creamy lattes, handcrafted
              <br className="desktop-break" /> with the finest beans for your
              perfect cup.
            </p>
          </div>
          <div className="home-menu-values">
            <div>
              <Coffee size={25} />
              <span>
                <b>Premium Beans</b>
                <small>
                  Sourced with care
                  <br />
                  for every cup.
                </small>
              </span>
            </div>
            <div>
              <Leaf size={25} />
              <span>
                <b>Freshly Made</b>
                <small>
                  Always brewed
                  <br />
                  just for you.
                </small>
              </span>
            </div>
          </div>
          <button
            className="home-outline-button"
            onClick={() => navigate("menu")}
          >
            View Full Menu
            <ArrowRight size={17} />
          </button>
        </div>
        <div
          className="home-category-tabs"
          role="group"
          aria-label="Featured menu categories"
        >
          {groups.map((g) => (
            <button
              key={g}
              className={group === g ? "active" : ""}
              aria-pressed={group === g}
              onClick={() => setGroup(g)}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="home-featured-grid">
          {rows.map((p, i) => (
            <article className="home-featured-card" key={p.id}>
              <button
                className="home-card-open"
                aria-label={`View ${p.name} ingredients and options`}
                onClick={() => add(p)}
              />
              <div className="home-featured-photo">
                <img src={productImage(p)} alt={p.name} loading="lazy" />
                <span>
                  {p.section === "Food"
                    ? "From the kitchen"
                    : p.category === "Cold Coffee"
                      ? "Cold & creamy"
                      : "Café classic"}
                </span>
              </div>
              <div className="home-featured-details">
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <div>
                  <b>{priceLabel(p)}</b>
                  <button
                    aria-label={`Add ${p.name} to order`}
                    disabled={!available(p, data.inventory) || b.paused}
                    onClick={() => add(p)}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {!rows.length && (
          <p className="home-empty">
            More favourites are on their way. Explore the full menu.
          </p>
        )}
      </section>
      <section className="home-play-banner">
        <div className="home-play-copy">
          <span className="section-kicker">
            PLAY PICKLEBALL
            <i />
          </span>
          <h2>Game. Coffee. Repeat.</h2>
          <p>
            Book a pickleball court and enjoy a refreshing
            <br className="desktop-break" /> game, followed by your favourite
            coffee.
          </p>
          <button
            className="home-outline-button"
            onClick={() => navigate("book")}
          >
            Book a Court
            <ArrowRight size={17} />
          </button>
        </div>
        <div className="home-play-features">
          {[
            {
              Icon: Trophy,
              title: "4 Premium Courts",
              text: "Make time for a rally",
            },
            {
              Icon: Clock,
              title: "Flexible Timings",
              text: "Morning to night",
            },
            {
              Icon: Leaf,
              title: "Comfortable Space",
              text: "Play, relax, repeat",
            },
            {
              Icon: ShoppingBag,
              title: "Coffee & Snacks",
              text: "Fuel your game",
            },
          ].map(({ Icon, title, text }) => (
            <div key={title}>
              <Icon size={24} />
              <span>
                <b>{title}</b>
                <small>{text}</small>
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="home-visit-strip" aria-label="Visit Lost Origin">
        <div>
          <MapPin />
          <span>
            <small>VISIT US</small>
            <b>{b.address}</b>
            <p>A cozy space for coffee, games and good vibes.</p>
          </span>
        </div>
        <div>
          <Clock />
          <span>
            <small>OPEN DAILY</small>
            <b>
              {b.openTime} – {b.closeTime}
            </b>
            <p>Coffee · Pickleball · Good Vibes</p>
          </span>
        </div>
        <div>
          <Coffee />
          <span>
            <small>PLAY, SIP & UNWIND</small>
            <b>Great coffee. Active days.</b>
            <p>It’s more than just a coffee house.</p>
          </span>
        </div>
      </section>
    </div>
  );
}

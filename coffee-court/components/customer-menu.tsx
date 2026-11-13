"use client";
import { useState } from "react";
import { ArrowRight, Coffee, Plus, Search, ShoppingBag, X } from "lucide-react";
import {
  available,
  categories,
  priceLabel,
  productVisible,
  type Product,
  type State,
} from "../lib/domain";
import { productImage } from "../lib/product-details";

export default function CustomerMenu({
  data,
  query,
  setQuery,
  category,
  setCategory,
  open,
}: {
  data: State;
  query: string;
  setQuery: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  open: (product: Product) => void;
}) {
  const [section, setSection] = useState("All");
  const published = data.products.filter((p) => productVisible(p, "website"));
  const catalogue = published.filter(
    (p) => section === "All" || p.section === section,
  );
  const visible = catalogue.filter(
    (p) =>
      (category === "All" || p.category === category) &&
      `${p.name} ${p.description} ${p.category}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const groups = categories(catalogue);
  const reset = () => {
    setSection("All");
    setCategory("All");
    setQuery("");
  };
  return (
    <section className="minimal-menu-page" id="menu">
      <header className="minimal-menu-intro">
        <div>
          <span className="section-kicker">
            THE LOST ORIGIN MENU
            <i />
          </span>
          <h1>Your daily favourites.</h1>
          <p>Good coffee. Fresh food. A little something for every mood.</p>
        </div>
        <div className="menu-service-note">
          <ShoppingBag size={24} strokeWidth={1.4} />
          <div>
            <b>Made fresh. Ready to go.</b>
            <span>Order online for takeaway.</span>
          </div>
        </div>
      </header>
      <div className="menu-discovery-bar">
        <div
          className="menu-section-switch"
          role="group"
          aria-label="Menu section"
        >
          {[
            ["All", "Everything"],
            ["Drinks", "Coffee & drinks"],
            ["Food", "From the kitchen"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={section === value}
              className={section === value ? "selected" : ""}
              onClick={() => {
                setSection(value);
                setCategory("All");
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="minimal-menu-search">
          <Search size={18} />
          <input
            aria-label="Search menu"
            placeholder="Find your favourite…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              aria-label="Clear menu search"
              onClick={() => setQuery("")}
            >
              <X size={16} />
            </button>
          )}
        </label>
      </div>
      {data.settings.business.paused && (
        <p className="menu-ordering-paused" role="status">
          Online ordering is paused. You can still explore the menu and order at
          the café.
        </p>
      )}
      <div className="minimal-menu-layout">
        <aside className="menu-category-rail">
          <span>EXPLORE THE MENU</span>
          <nav aria-label="Menu categories">
            {["All", ...groups].map((name) => (
              <button
                key={name}
                aria-pressed={category === name}
                className={category === name ? "selected" : ""}
                onClick={() => setCategory(name)}
              >
                <span>{name === "All" ? "All favourites" : name}</span>
                <small>
                  {name === "All"
                    ? catalogue.length
                    : catalogue.filter((p) => p.category === name).length}
                </small>
              </button>
            ))}
          </nav>
          <div className="menu-rail-note">
            <Coffee size={25} strokeWidth={1.3} />
            <p>
              Something good
              <br />
              starts with a cup.
            </p>
            <small>
              Prices before tax.
              <br />
              Tax added at checkout.
            </small>
          </div>
        </aside>
        <div className="minimal-menu-results">
          <div className="menu-result-heading">
            <p>
              {query
                ? `Results for “${query}”`
                : category === "All"
                  ? section === "All"
                    ? "A taste of Lost Origin"
                    : section === "Food"
                      ? "From our kitchen"
                      : "Brewed & poured"
                  : category}
            </p>
            <span aria-live="polite">
              {visible.length} {visible.length === 1 ? "item" : "items"}
            </span>
          </div>
          {groups
            .filter((name) => visible.some((p) => p.category === name))
            .map((name) => (
              <section
                key={name}
                className="menu-category-section"
                aria-label={name}
              >
                <div className="menu-group-heading">
                  <h2>{name}</h2>
                  <span>
                    {visible
                      .filter((p) => p.category === name)
                      .length.toString()
                      .padStart(2, "0")}
                  </span>
                  <i />
                </div>
                <div className="minimal-menu-grid">
                  {visible
                    .filter((p) => p.category === name)
                    .map((p) => {
                      const inStock = available(p, data.inventory),
                        canOrder = inStock && !data.settings.business.paused;
                      return (
                        <article
                          className="customer-product minimal-menu-card"
                          key={p.id}
                          onClick={(event) => {
                            if (
                              !(event.target as HTMLElement).closest("button")
                            )
                              open(p);
                          }}
                        >
                          <button
                            className="menu-item-open"
                            aria-label={`View ${p.name} ingredients and options`}
                            onClick={() => open(p)}
                          >
                            <div className="menu-item-photo">
                              <img
                                src={productImage(p)}
                                alt=""
                                loading="lazy"
                              />
                              {!inStock && <span>Back soon</span>}
                            </div>
                            <div className="menu-item-copy">
                              <span
                                className={`menu-diet-label ${p.diet === "nonveg" || p.diet === "egg" ? "contains-egg" : ""}`}
                              >
                                <i />
                                {p.diet === "nonveg"
                                  ? "Non-vegetarian"
                                  : p.diet === "egg"
                                    ? "Contains egg"
                                    : "Vegetarian"}
                              </span>
                              <h3>{p.name}</h3>
                              <p>{p.description}</p>
                              <span className="menu-item-details-hint">
                                Ingredients & options <ArrowRight size={13} />
                              </span>
                            </div>
                          </button>
                          <div className="menu-item-purchase">
                            <b>{priceLabel(p)}</b>
                            <button
                              className="menu-item-add"
                              aria-label={`Add ${p.name} to order`}
                              disabled={!canOrder}
                              onClick={() => open(p)}
                            >
                              <span>{inStock ? "Add" : "Sold out"}</span>
                              {inStock && <Plus size={15} />}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                </div>
              </section>
            ))}
          {!visible.length && (
            <div className="minimal-menu-empty">
              <Search size={30} strokeWidth={1.3} />
              <h2>No favourites found.</h2>
              <p>Try another search or explore the full menu.</p>
              <button className="home-outline-button" onClick={reset}>
                View all items
                <ArrowRight size={16} />
              </button>
            </div>
          )}
          <p className="minimal-menu-footnote">
            Made to order, just for you. Please ask our team about allergies or
            dietary needs.
          </p>
        </div>
      </div>
    </section>
  );
}

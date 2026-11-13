import { Coffee, CupSoda, Utensils } from "lucide-react";
import { productVisible, type Product } from "../lib/domain";

const rupees = (paise: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(
    paise / 100,
  );
function Rows({ products }: { products: Product[] }) {
  return (
    <dl className="glass-board-rows">
      {products.map((product) => (
        <div
          className="glass-board-row"
          key={product.id}
          data-product-id={product.id}
        >
          <dt>{product.name}</dt>
          <dd>
            {(product.variants?.length
              ? product.variants
              : [{ price: product.price }]
            )
              .map((variant) => rupees(variant.price))
              .join(" / ")}
          </dd>
        </div>
      ))}
    </dl>
  );
}
function Pins() {
  return (
    <div className="glass-board-pins" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </div>
  );
}
export default function GlassMenuBoards({ products }: { products: Product[] }) {
  const items = (category: string, limit: number) =>
    products
      .filter(
        (product) =>
          productVisible(product, "website") && product.category === category,
      )
      .slice(0, limit);
  return (
    <div className="glass-menu-boards" aria-hidden="true">
      <section className="glass-menu-board glass-coffee-board">
        <Pins />
        <div className="glass-board-heading">
          <Coffee />
          <h2>COFFEE</h2>
          <span>Hot / Cold</span>
        </div>
        <Rows products={items("Espresso", 8)} />
      </section>
      <section className="glass-menu-board glass-cold-board">
        <Pins />
        <div className="glass-board-heading">
          <CupSoda />
          <h2>COLD COFFEE</h2>
        </div>
        <Rows products={items("Cold Coffee", 3)} />
        <div className="glass-board-heading glass-board-subheading">
          <CupSoda />
          <h2>COLD BREW</h2>
        </div>
        <Rows products={items("Cold Brew", 3)} />
      </section>
      <section className="glass-menu-board glass-food-board">
        <Pins />
        <div className="glass-board-heading">
          <Utensils />
          <h2>FOOD MENU</h2>
        </div>
        {["Fries", "Sandwich", "Pasta"].map((category) => (
          <div className="glass-food-section" key={category}>
            <h3>{category.toUpperCase()}</h3>
            <Rows products={items(category, 2)} />
          </div>
        ))}
      </section>
    </div>
  );
}

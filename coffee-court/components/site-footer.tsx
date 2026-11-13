import {
  CalendarDays,
  Coffee,
  Gift,
  MapPin,
  Clock,
  Phone,
  Mail,
  MessageCircle,
  ArrowUpRight,
} from "lucide-react";
import {
  InstagramIcon as Instagram,
  YoutubeIcon as Youtube,
  LinkedinIcon as Linkedin,
} from "./social-icons";
const time = (value: string) => {
  const [h, m] = (value || "00:00").split(":").map(Number);
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};
const safeUrl = (value: unknown) =>
  typeof value === "string" && /^https:\/\//i.test(value) ? value : "";
export default function SiteFooter({
  business,
  navigate,
  policy,
  offers,
}: {
  business: Record<string, any>;
  navigate: (view: string) => void;
  policy: (kind: string) => void;
  offers: () => void;
}) {
  const link = (view: string, label: string, Icon?: any) => (
    <a
      key={view + label}
      href={`?view=${view}`}
      onClick={(e) => {
        e.preventDefault();
        navigate(view);
      }}
    >
      {Icon && <Icon size={20} />}
      <span>{label}</span>
    </a>
  );
  const socials = [
    { key: "instagram", name: "Instagram", Icon: Instagram },
    { key: "youtube", name: "YouTube", Icon: Youtube },
    { key: "linkedin", name: "LinkedIn", Icon: Linkedin },
    { key: "whatsapp", name: "WhatsApp", Icon: MessageCircle },
  ];
  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <div className="site-footer-brand">
          <a
            href="?view=home"
            aria-label="Lost Origin home"
            onClick={(e) => {
              e.preventDefault();
              navigate("home");
            }}
          >
            <img src="/lost-origin-logo.svg" alt="Lost Origin Coffee House" />
          </a>
          <p>
            {business.footerTagline ||
              "Great Coffee. Good Games.\nEven Better Company."}
          </p>
        </div>
        <nav className="site-footer-column" aria-label="Footer quick links">
          <h2>QUICK LINKS</h2>
          {link("home", "Home")}
          {link("menu", "Our Menu")}
          {link("book", "Play Pickleball")}
          {link("track", "My Orders")}
        </nav>
        <nav className="site-footer-column" aria-label="More at Lost Origin">
          <h2>MORE AT LOST ORIGIN</h2>
          {link("book", "Book a Court", CalendarDays)}
          {link("menu", "Café Menu", Coffee)}
          <button onClick={offers}>
            <Gift size={20} />
            <span>Offers & Events</span>
          </button>
        </nav>
        <div className="site-footer-column site-footer-visit">
          <h2>VISIT US</h2>
          <p>
            <MapPin size={20} />
            <span>{business.address || "Hyderabad, Telangana"}</span>
          </p>
          <p>
            <Clock size={20} />
            <span>
              Daily, {time(business.openTime)} – {time(business.closeTime)}
            </span>
          </p>
          {business.phone && (
            <a href={`tel:${business.phone}`}>
              <Phone size={20} />
              <span>{business.phone}</span>
            </a>
          )}
          {business.email && (
            <a href={`mailto:${business.email}`}>
              <Mail size={20} />
              <span>{business.email}</span>
            </a>
          )}
        </div>
        <div className="site-footer-column site-footer-social">
          <h2>STAY CONNECTED</h2>
          <p>Follow us for updates, new menu items and events.</p>
          <div className="site-social-links">
            {socials.map(({ key, name, Icon }) =>
              safeUrl(business.socialLinks?.[key]) ? (
                <a
                  key={key}
                  className={`social-link social-${key}`}
                  href={safeUrl(business.socialLinks[key])}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={name}
                >
                  <Icon />
                </a>
              ) : (
                <span
                  key={key}
                  role="img"
                  aria-label={`${name} link not yet available`}
                  title={`${name} · coming soon`}
                >
                  <Icon />
                </span>
              ),
            )}
          </div>
        </div>
      </div>
      <div className="site-footer-bottom">
        <p>
          © {new Date().getFullYear()} Lost Origin Coffee House. All rights
          reserved.
        </p>
        <div>
          <a
            className="site-footer-credit"
            href="https://www.dropxcorp.in"
            target="_blank"
            rel="noopener noreferrer"
          >
            Designed and Developed by <b>DropXcorp Pvt Ltd</b>
            <ArrowUpRight size={15} />
          </a>
          <span className="footer-divider" />
          <button onClick={() => policy("privacy")}>Privacy Policy</button>
          <span> | </span>
          <button onClick={() => policy("terms")}>Terms & Conditions</button>
        </div>
      </div>
    </footer>
  );
}

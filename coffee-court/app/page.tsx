import CoffeeApp from "../components/coffee-app";
import { env } from "cloudflare:workers";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const view = (await searchParams).view;
  const adminViews = [
    "overview",
    "orders",
    "pos",
    "kitchen",
    "courts",
    "inventory",
    "products",
    "payments",
    "accounting",
    "partners",
    "campaigns",
    "website",
    "whatsapp",
    "reports",
    "settings",
  ];
  if (view && adminViews.includes(view) && env.ADMIN_ORIGIN)
    redirect(`${env.ADMIN_ORIGIN}/admin?view=${encodeURIComponent(view)}`);
  return <CoffeeApp surface="website" />;
}

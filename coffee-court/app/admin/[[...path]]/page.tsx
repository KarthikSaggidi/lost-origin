import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "cloudflare:workers";
import { adminTransport } from "../../../lib/auth-transport";
import AdminLogin from "../../../components/admin-login";
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const incoming = await headers();
  if (
    !adminTransport(
      new Request("https://lost-origin.invalid/admin", { headers: incoming }),
    )
  )
    redirect(env.ADMIN_ORIGIN ? `${env.ADMIN_ORIGIN}/admin/login` : "/");
  return <AdminLogin />;
}

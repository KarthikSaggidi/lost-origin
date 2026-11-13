import { applicationSession } from "./auth-session";
export async function isAdminRequest(request: Request) {
  return (await applicationSession(request))?.role === "admin";
}

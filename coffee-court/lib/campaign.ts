import type { State } from "./domain";
export type HeroCampaign = { text: string; enabled: boolean; speed: number };
export const defaultHeroCampaign: HeroCampaign = {
  text: "Great coffee. Good games. Even better company.",
  enabled: false,
  speed: 30,
};
export function heroCampaign(data: Pick<State, "documents">): HeroCampaign {
  const value = data.documents.find(
    (d) => d.type === "heroCampaign" && d.id === "hero-announcement",
  )?.data;
  return value && typeof value.text === "string"
    ? {
        text: value.text,
        enabled: Boolean(value.enabled),
        speed: Math.max(15, Math.min(90, Number(value.speed) || 30)),
      }
    : defaultHeroCampaign;
}

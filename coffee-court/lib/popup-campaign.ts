import { z } from "zod";
export const popupFieldSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/),
  label: z.string().trim().min(1).max(80),
  type: z.enum(["text", "tel", "email"]),
  enabled: z.boolean(),
  required: z.boolean(),
});
const time = z.union([z.literal(""), z.string().datetime({ offset: true })]);
export const popupCampaignSchema = z
  .object({
    campaignId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
    enabled: z.boolean(),
    title: z.string().trim().min(2).max(100),
    description: z.string().trim().max(700),
    image: z.union([
      z.literal(""),
      z
        .string()
        .max(240)
        .regex(
          /^\/(?:images\/[a-zA-Z0-9._-]+|api\/v1\/media\/[a-zA-Z0-9._-]+)$/,
        ),
    ]),
    imageAlt: z.string().trim().max(180),
    buttonLabel: z.string().trim().min(2).max(40),
    successMessage: z.string().trim().min(2).max(300),
    delaySeconds: z.number().int().min(0).max(60),
    frequency: z.enum(["session", "daily", "always"]),
    pages: z
      .array(z.enum(["home", "menu", "book", "track"]))
      .min(1)
      .max(4),
    startAt: time,
    endAt: time,
    registrationEnabled: z.boolean(),
    target: z.enum(["menu", "book"]),
    fields: z.array(popupFieldSchema).max(8),
  })
  .superRefine((value, ctx) => {
    if (
      value.startAt &&
      value.endAt &&
      Date.parse(value.endAt) <= Date.parse(value.startAt)
    )
      ctx.addIssue({
        code: "custom",
        message: "Campaign end must be after its start.",
        path: ["endAt"],
      });
    if (
      new Set(value.fields.map((field) => field.id)).size !==
      value.fields.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Each registration field needs a unique ID.",
        path: ["fields"],
      });
    if (
      value.registrationEnabled &&
      !value.fields.some((field) => field.enabled)
    )
      ctx.addIssue({
        code: "custom",
        message: "Enable at least one registration field.",
        path: ["fields"],
      });
    if (value.image && !value.imageAlt)
      ctx.addIssue({
        code: "custom",
        message: "Add a description for the campaign image.",
        path: ["imageAlt"],
      });
  });
export type PopupCampaign = z.infer<typeof popupCampaignSchema>;
export const defaultPopupCampaign: PopupCampaign = {
  campaignId: "popup-main",
  enabled: false,
  title: "Something good is coming.",
  description: "Leave your details and our team will get in touch.",
  image: "",
  imageAlt: "",
  buttonLabel: "Register interest",
  successMessage:
    "Thank you! Your details have been shared with the Lost Origin team.",
  delaySeconds: 2,
  frequency: "session",
  pages: ["home"],
  startAt: "",
  endAt: "",
  registrationEnabled: true,
  target: "menu",
  fields: [
    {
      id: "name",
      label: "Your name",
      type: "text",
      enabled: true,
      required: true,
    },
    {
      id: "phone",
      label: "Contact number",
      type: "tel",
      enabled: true,
      required: true,
    },
    {
      id: "email",
      label: "Email address",
      type: "email",
      enabled: false,
      required: false,
    },
  ],
};
export function popupCampaign(data: {
  documents: { id: string; type: string; data: any }[];
}): PopupCampaign {
  const saved = data.documents.find(
    (d) => d.id === "popup-campaign" && d.type === "popupCampaign",
  );
  const parsed = popupCampaignSchema.safeParse(saved?.data);
  return parsed.success ? parsed.data : defaultPopupCampaign;
}
export function popupCampaignStatus(campaign: PopupCampaign, now = Date.now()) {
  if (!campaign.enabled) return "Disabled";
  if (campaign.startAt && Date.parse(campaign.startAt) > now)
    return "Scheduled";
  if (campaign.endAt && Date.parse(campaign.endAt) <= now) return "Ended";
  return "Live";
}
export function registrationAnswers(
  campaign: PopupCampaign,
  input: Record<string, string>,
) {
  const fields = campaign.fields.filter((f) => f.enabled);
  const answers: Record<string, string> = {};
  if (
    Object.keys(input).some((key) => !fields.some((field) => field.id === key))
  )
    throw new Error(
      "The registration fields changed. Please review the form and try again.",
    );
  for (const field of fields) {
    const value = (input[field.id] || "").trim();
    if (!value && field.required)
      throw new Error(`Enter ${field.label.toLowerCase()}.`);
    if (value.length > (field.type === "email" ? 160 : 200))
      throw new Error(`${field.label} is too long.`);
    if (value && field.type === "tel" && !/^[6-9]\d{9}$/.test(value))
      throw new Error(
        `Enter a valid 10-digit Indian mobile number for ${field.label.toLowerCase()}.`,
      );
    if (
      value &&
      field.type === "email" &&
      !z.string().email().safeParse(value).success
    )
      throw new Error(`Enter a valid ${field.label.toLowerCase()}.`);
    answers[field.id] = value;
  }
  return answers;
}
export type CampaignRegistration = {
  marketingOptIn?: number;
  id: string;
  campaignId: string;
  campaignTitle: string;
  name: string;
  phone: string;
  email: string;
  answers: Record<string, string>;
  fieldLabels: Record<string, string>;
  status: "New" | "Contacted" | "Closed";
  createdAt: string;
  updatedAt: string;
  requestKey: string;
};

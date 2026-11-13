import { Field } from "./shared";
export default function FooterSettings({
  form,
  update,
}: {
  form: Record<string, any>;
  update: (key: string, value: any) => void;
}) {
  return (
    <div className="footer-settings-fields">
      <h3>Website footer & contact</h3>
      <p className="note">
        These details appear in the shared website footer. Leave a social link
        blank until it is ready.
      </p>
      <Field label="Footer tagline">
        <textarea
          rows={2}
          maxLength={180}
          value={
            form.footerTagline ??
            "Great Coffee. Good Games.\nEven Better Company."
          }
          onChange={(e) => update("footerTagline", e.target.value)}
        />
      </Field>
      <div className="form-grid">
        <Field label="Public contact email">
          <input
            type="email"
            maxLength={160}
            value={form.email || ""}
            onChange={(e) => update("email", e.target.value)}
            placeholder="Email address"
          />
        </Field>
        <Field label="Public contact phone">
          <input
            type="tel"
            maxLength={20}
            value={form.phone || ""}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="Phone number"
          />
        </Field>
      </div>
      {[
        ["instagram", "Instagram"],
        ["youtube", "YouTube"],
        ["linkedin", "LinkedIn"],
        ["whatsapp", "WhatsApp"],
      ].map(([key, label]) => (
        <Field label={`${label} URL`} key={key}>
          <input
            type="url"
            pattern="https://.*"
            maxLength={300}
            placeholder="https://…"
            value={form.socialLinks?.[key] || ""}
            onChange={(e) =>
              update("socialLinks", {
                instagram: "",
                youtube: "",
                linkedin: "",
                whatsapp: "",
                ...form.socialLinks,
                [key]: e.target.value,
              })
            }
          />
        </Field>
      ))}
      <Field label="Privacy policy text">
        <textarea
          rows={5}
          maxLength={5000}
          value={form.privacyPolicy || ""}
          onChange={(e) => update("privacyPolicy", e.target.value)}
          placeholder="Your privacy information…"
        />
      </Field>
      <Field label="Terms & conditions text">
        <textarea
          rows={5}
          maxLength={5000}
          value={form.terms || ""}
          onChange={(e) => update("terms", e.target.value)}
          placeholder="Your café and court booking terms…"
        />
      </Field>
    </div>
  );
}

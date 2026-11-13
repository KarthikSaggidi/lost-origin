import tailwindcss from "@tailwindcss/postcss";
import adminTypography from "./scripts/admin-typography.mjs";
export default { plugins: [tailwindcss(), adminTypography()] };

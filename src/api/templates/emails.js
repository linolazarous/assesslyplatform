import path from "path";
import fs from "fs";

// Support ESM __dirname
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Folder containing your .hbs templates
const templatesPath = path.join(__dirname, "emails");

// Cache to avoid reading files multiple times
const templateCache = new Map();

const loadTemplate = (fileName) => {
  const filePath = path.join(templatesPath, fileName);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Email template missing: ${filePath}`);
    return "";
  }

  if (!templateCache.has(fileName)) {
    const content = fs.readFileSync(filePath, "utf8");
    templateCache.set(fileName, content);
  }

  return templateCache.get(fileName);
};

export const ORGANIZATION_INVITATION_TEMPLATE =
  loadTemplate("organization-invitation.hbs");
export const PASSWORD_RESET_TEMPLATE =
  loadTemplate("password-reset.hbs");
export const USER_WELCOME_TEMPLATE =
  loadTemplate("user-welcome.hbs");

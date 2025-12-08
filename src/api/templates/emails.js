import path from "path";
import fs from "fs";

const templatesPath = path.join(__dirname, "emails");

// Utility to load a Handlebars template file
export const loadTemplate = (fileName) => {
  const filePath = path.join(templatesPath, fileName);
  return fs.readFileSync(filePath, "utf8");
};

// Export each template as a named constant
export const ORGANIZATION_INVITATION_TEMPLATE = loadTemplate("organization-invitation.hbs");
export const PASSWORD_RESET_TEMPLATE = loadTemplate("password-reset.hbs");
export const USER_WELCOME_TEMPLATE = loadTemplate("user-welcome.hbs");

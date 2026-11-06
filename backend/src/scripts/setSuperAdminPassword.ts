import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { askHidden, askVisible } from "./hiddenInput";

const envPath = path.resolve(process.cwd(), ".env");

async function main(): Promise<void> {
  if (!fs.existsSync(envPath)) throw new Error("backend/.env was not found.");
  const password = await askHidden("Super Admin password: ");
  const confirmation = await askHidden("Confirm password: ");
  if (!password || password !== confirmation) throw new Error("Passwords did not match.");
  const hash = await bcrypt.hash(password, 12);
  const current = fs.readFileSync(envPath, "utf8");
  const line = /^SUPER_ADMIN_PASSWORD_HASH=.*$/m;
  const updated = line.test(current) ? current.replace(line, `SUPER_ADMIN_PASSWORD_HASH=${hash}`) : `${current.trimEnd()}\nSUPER_ADMIN_PASSWORD_HASH=${hash}\n`;
  fs.writeFileSync(envPath, updated, { encoding: "utf8", mode: 0o600 });
  const saved = (updated.match(/^SUPER_ADMIN_PASSWORD_HASH=(.*)$/m)?.[1] || "").trim();
  const validFormat = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(saved) && saved.length === 60;
  if (!validFormat || !(await bcrypt.compare(password, saved))) throw new Error("Private hash verification failed.");
  process.stdout.write("PASS: Super Admin bcrypt hash saved and privately verified.\n");
}

main().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : "Password setup failed."}\n`); process.exitCode = 1; });

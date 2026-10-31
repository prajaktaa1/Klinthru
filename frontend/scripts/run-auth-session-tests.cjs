const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../src/lib/authStorage.ts"), "utf8")
  .replace(/export /g, "")
  .replace(/type JwtPayload = \{ exp\?: unknown \};\r?\n/, "")
  .replace(/: JwtPayload \| null/g, "")
  .replace(/: string/g, "")
  .replace(/: boolean/g, "")
  .replace(/ as JwtPayload/g, "")
  .replace(/ as unknown/g, "")
  .replace(/: token is string/g, "");
const values = new Map();
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
const context = { window: { localStorage: storage, sessionStorage: storage }, atob: value => Buffer.from(value, "base64").toString("binary"), Date, Math };
vm.runInNewContext(`${source}\nthis.getStoredAuthToken = getStoredAuthToken;`, context);

const token = payload => `${Buffer.from("header").toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
const now = Math.floor(Date.now() / 1000);

values.set("klinthru-auth-token", token({ exp: now - 10 }));
values.set("klinthru-auth-token-session", token({ exp: now + 600 }));
context.window.sessionStorage = { getItem: key => key === "klinthru-auth-token" ? values.get("klinthru-auth-token-session") : null, removeItem: () => {} };
assert.equal(context.getStoredAuthToken(), values.get("klinthru-auth-token-session"), "a valid session token wins over an expired local token");

context.window.localStorage = { getItem: () => token({ exp: now - 10 }), removeItem: () => {} };
context.window.sessionStorage = { getItem: () => token({ exp: now - 5 }), removeItem: () => {} };
assert.equal(context.getStoredAuthToken(), null, "expired tokens are not sent to protected APIs");

context.window.localStorage = { getItem: () => "browser-test-only", removeItem: () => {} };
context.window.sessionStorage = { getItem: () => null, removeItem: () => {} };
assert.equal(context.getStoredAuthToken(), "browser-test-only", "opaque test/browser tokens remain compatible with intercepted requests");

console.log("PASS auth session token selection and expiry handling");

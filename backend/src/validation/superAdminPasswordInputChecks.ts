import assert from "assert";
import { parseHiddenInput } from "../scripts/hiddenInput";

function run(): void {
  assert.equal(parseHiddenInput(["same-password\r"]), "same-password");
  assert.equal(parseHiddenInput(["same-", "password", "\r\n"]), "same-password");
  assert.equal(parseHiddenInput(["different\n"]), "different");
  assert.notEqual(parseHiddenInput(["first\r"]), parseHiddenInput(["second\r"]));
  assert.equal(parseHiddenInput(["P@ssw0rd!#$%^&*()\r"]), "P@ssw0rd!#$%^&*()");
  assert.equal(parseHiddenInput(["abc\b\bd\r"]), "ad");
  console.log("Super Admin hidden-input checks PASS");
}

run();

import assert from "node:assert/strict";

import {
  resetAdminPasswordWithUserDelegate,
  validateResetAdminPasswordInput
} from "../scripts/resetAdminPassword";

type MockUser = {
  id: string;
  email: string;
  passwordHash: string;
  role: "Admin" | "Engineer" | "Viewer";
};

function createMockUserDelegate(users: MockUser[]) {
  return {
    findUnique: async ({ where }: { where: { email: string } }) =>
      users.find((user) => user.email === where.email) ?? null,
    update: async ({ where, data }: { where: { email: string }; data: { passwordHash: string } }) => {
      const user = users.find((candidate) => candidate.email === where.email);
      if (!user) {
        throw new Error("User not found");
      }

      user.passwordHash = data.passwordHash;
      return user;
    }
  };
}

async function run() {
  assert.throws(() =>
    validateResetAdminPasswordInput({
      email: "bad-email",
      password: "StrongPass123!"
    })
  );

  assert.throws(() =>
    validateResetAdminPasswordInput({
      email: "admin@example.com",
      password: "weak"
    })
  );

  {
    const users: MockUser[] = [
      {
        id: "admin",
        email: "admin@example.com",
        passwordHash: "old-hash",
        role: "Admin"
      }
    ];
    const updated = await resetAdminPasswordWithUserDelegate(createMockUserDelegate(users), {
      email: "ADMIN@EXAMPLE.COM",
      password: "StrongPass123!"
    });

    assert.equal(updated.role, "Admin");
    assert.equal(updated.email, "admin@example.com");
    assert.notEqual(users[0].passwordHash, "old-hash");
    assert.notEqual(users[0].passwordHash, "StrongPass123!");
    assert.equal(users.length, 1);
  }

  {
    const users: MockUser[] = [
      {
        id: "engineer",
        email: "engineer@example.com",
        passwordHash: "old-hash",
        role: "Engineer"
      }
    ];
    await assert.rejects(
      () =>
        resetAdminPasswordWithUserDelegate(createMockUserDelegate(users), {
          email: "engineer@example.com",
          password: "StrongPass123!"
        }),
      /not an Admin/
    );
    assert.equal(users[0].passwordHash, "old-hash");
  }

  {
    const users: MockUser[] = [];
    await assert.rejects(
      () =>
        resetAdminPasswordWithUserDelegate(createMockUserDelegate(users), {
          email: "missing@example.com",
          password: "StrongPass123!"
        }),
      /not found/
    );
  }

  console.log("Reset admin password checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

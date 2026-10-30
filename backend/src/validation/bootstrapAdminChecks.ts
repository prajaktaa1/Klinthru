import assert from "node:assert/strict";

import { bootstrapFirstAdminWithUserDelegate, validateBootstrapAdminInput } from "../scripts/bootstrapAdmin";

type MockUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "Admin";
};

function createMockUserDelegate(users: MockUser[]) {
  return {
    count: async () => users.length,
    findUnique: async ({ where }: { where: { email: string } }) =>
      users.find((user) => user.email === where.email) ?? null,
    create: async ({ data }: { data: Omit<MockUser, "id"> }) => {
      const duplicate = users.find((user) => user.email === data.email);
      if (duplicate) {
        throw new Error("Duplicate email");
      }

      const user: MockUser = {
        id: `user-${users.length + 1}`,
        ...data
      };
      users.push(user);
      return user;
    }
  };
}

async function run() {
  assert.throws(() =>
    validateBootstrapAdminInput({
      email: "bad-email",
      name: "Admin",
      password: "StrongPass123!"
    })
  );

  assert.throws(() =>
    validateBootstrapAdminInput({
      email: "admin@example.com",
      name: "Admin",
      password: "weak"
    })
  );

  {
    const users: MockUser[] = [];
    const created = await bootstrapFirstAdminWithUserDelegate(createMockUserDelegate(users), {
      email: "ADMIN@EXAMPLE.COM",
      name: "First Admin",
      password: "StrongPass123!"
    });

    assert.equal(created.role, "Admin");
    assert.equal(created.email, "admin@example.com");
    assert.equal(users.length, 1);
    assert.equal(users[0].role, "Admin");
    assert.notEqual(users[0].passwordHash, "StrongPass123!");
  }

  {
    const users: MockUser[] = [
      {
        id: "existing",
        email: "existing@example.com",
        name: "Existing User",
        passwordHash: "hash",
        role: "Admin"
      }
    ];
    await assert.rejects(
      () =>
        bootstrapFirstAdminWithUserDelegate(createMockUserDelegate(users), {
          email: "new@example.com",
          name: "New Admin",
          password: "StrongPass123!"
        }),
      /already exists/
    );
    assert.equal(users.length, 1);
  }

  console.log("Bootstrap admin checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

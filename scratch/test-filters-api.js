const { GET } = require("../src/app/api/events/filters/route");
const { signJwt } = require("../src/lib/auth/jwt");

async function run() {
  // Generate a valid JWT token
  const token = signJwt({
    sub: 1,
    tenantId: 1,
    email: "admin@example.com",
    roles: ["Admin"],
    permissions: ["INVENTORY_VIEW"],
  });

  // Create a mock request object
  const req = {
    headers: {
      get: (name) => {
        if (name === "authorization") {
          return `Bearer ${token}`;
        }
        return null;
      },
    },
    url: "http://localhost:3000/api/events/filters",
  };

  try {
    const res = await GET(req);
    console.log("Response status:", res.status);
    const body = await res.json();
    console.log("Response body:", JSON.stringify(body, null, 2));
  } catch (err) {
    console.error("GET failed with error:", err);
  }
}

run();

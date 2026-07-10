async function main() {
  const url = "http://localhost:5000/api/runtime/laundry/vehicle";
  // We need to pass a valid Authorization header or we will get 401.
  // Wait, if we get 401, we won't see the real error.
  // Let's just generate a valid token.
  const { signJwt } = await import("./src/lib/auth/jwt.ts");
  const token = signJwt({
    sub: 1,
    tenantId: 1,
    email: "admin@example.com",
    roles: ["Admin"],
    permissions: []
  });

  console.log("Fetching with token:", token.substring(0, 20) + "...");

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text);
}

main().catch(console.error);

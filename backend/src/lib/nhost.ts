import "dotenv/config";

// ==================================================
// ENVIRONMENT VARIABLES
// ==================================================

const subdomain = process.env.NHOST_SUBDOMAIN;
const region = process.env.NHOST_REGION;
const adminSecret = process.env.NHOST_ADMIN_SECRET;

// ==================================================
// ENV VALIDATION
// ==================================================

if (!subdomain) {
  throw new Error("NHOST_SUBDOMAIN is missing");
}

if (!region) {
  throw new Error("NHOST_REGION is missing");
}

if (!adminSecret) {
  throw new Error("NHOST_ADMIN_SECRET is missing");
}

// ==================================================
// GRAPHQL URL
// ==================================================

export const graphqlUrl =
  `https://${subdomain}.graphql.${region}.nhost.run/v1`;

// ==================================================
// GRAPHQL REQUEST HELPER
// ==================================================

export async function graphqlRequest(
  query: string,
  variables: Record<string, unknown> = {}
) {
  const response = await fetch(graphqlUrl, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": adminSecret,
    } as Record<string, string>,

    body: JSON.stringify({
      query,
      variables,
    }),
  });

  // ==================================================
  // RESPONSE BODY
  // ==================================================

  const body = await response.json();

  console.log(
    "GraphQL Response:",
    JSON.stringify(body, null, 2)
  );

  // ==================================================
  // HTTP ERROR
  // ==================================================

  if (!response.ok) {
    throw new Error(
      `GraphQL HTTP error ${response.status}: ${JSON.stringify(body)}`
    );
  }

  // ==================================================
  // GRAPHQL ERROR
  // ==================================================

  if (body.errors && body.errors.length > 0) {
    throw new Error(
      JSON.stringify(body.errors)
    );
  }

  // ==================================================
  // RETURN DATA
  // ==================================================

  return body.data;
}
import { datasetRouter, registerLegacyDatasetClientFactory } from "./dataset-runtime";
import { createClient } from "@supabase/supabase-js";

type LegacyClient = ReturnType<typeof createLegacyClient>;

// Importing routes and resolving a dataset token must not open the legacy source.
// Credentials are read only when a request bound to legacy first uses its client.
function createLegacyClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error("Legacy source client unavailable");
  }
  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
registerLegacyDatasetClientFactory(createLegacyClient);
// Every existing consumer resolves through the same request-pinned provider.
export const supabaseServer: LegacyClient = new Proxy({} as LegacyClient, {
  get(_target, key) {
    const client = datasetRouter.client() as LegacyClient;
    const value = Reflect.get(client, key, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

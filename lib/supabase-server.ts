import { datasetRouter, registerLegacyDatasetClient } from "./dataset-runtime";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL");
}

if (!supabaseSecretKey) {
  throw new Error("Missing SUPABASE_SECRET_KEY");
}

const legacyClient = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
registerLegacyDatasetClient(legacyClient);
// Every existing consumer resolves through the same request-pinned provider.
export const supabaseServer: typeof legacyClient = new Proxy(legacyClient, {
  get(_target, key) {
    const client = datasetRouter.client() as typeof legacyClient;
    const value = Reflect.get(client, key, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

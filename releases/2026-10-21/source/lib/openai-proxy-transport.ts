import {EnvHttpProxyAgent, fetch as undiciFetch} from "undici";
import type {ClientOptions} from "openai";

type ProxyEnvironment = Readonly<Record<string, string | undefined>>;

// OpenAI's documented Node transport: pair Undici fetch with its dispatcher.
// Client-scoped only; never alter the global dispatcher, credentials or policy.
export function openAIProxyTransport(env: ProxyEnvironment = process.env): Pick<ClientOptions, "fetch" | "fetchOptions"> {
  const httpProxy = env.http_proxy ?? env.HTTP_PROXY ?? "";
  const httpsProxy = env.https_proxy ?? env.HTTPS_PROXY ?? "";
  if (!httpProxy && !httpsProxy) return {};
  try {
    const dispatcher = new EnvHttpProxyAgent({httpProxy, httpsProxy, noProxy: env.no_proxy ?? env.NO_PROXY ?? ""});
    return {
      // DOM and Undici expose different Request type declarations for the same
      // standard fetch contract. The SDK calls this with URL/string inputs.
      fetch: undiciFetch as unknown as ClientOptions["fetch"],
      fetchOptions: {dispatcher},
    };
  } catch {
    // Proxy URLs may contain credentials. Never include the original error.
    throw new Error("Configured OpenAI proxy transport is invalid.");
  }
}

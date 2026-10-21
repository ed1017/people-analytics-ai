// Server/test adapter only. No product route or browser caller imports this
// module. Synthetic test transmission is approved; live auth remains gated.
import OpenAI from "openai";
// @ts-expect-error Native Node test harness shares the TypeScript implementation.
import {CHAT_MODEL} from "./chat-model.ts";
// @ts-expect-error Native Node test harness shares the TypeScript implementation.
import {openAIProxyTransport} from "./openai-proxy-transport.ts";
// @ts-expect-error Native Node test harness shares the TypeScript implementation.
import {workforceAgentModelRequest,decodeWorkforceAgentResponse} from "./workforce-agent-contract.ts";
import type {WorkforceAgentTurn} from "./workforce-planning-agent";

export function createWorkforceAgentOpenAIModel(client: OpenAI) {
  return async (turn: WorkforceAgentTurn, signal: AbortSignal) => {
    if (signal.aborted) throw Error("Workforce model request cancelled.");
    const request = workforceAgentModelRequest(turn);
    let response: unknown;
    try {
      response = await client.responses.create({model: CHAT_MODEL, ...request}, {signal, maxRetries: 0, timeout: 30000});
    } catch (error) {
      // SDK error messages/bodies/headers may contain request or authentication
      // details. Keep only the numeric HTTP status; never retain cause/raw error.
      if (signal.aborted) throw Error("Workforce model request cancelled.");
      const status = error instanceof OpenAI.APIError ? error.status : undefined;
      throw Error(Number.isInteger(status) && status! >= 400 && status! <= 599
        ? `Workforce model request failed (HTTP ${status}); no retry was attempted.`
        : "Workforce model transport failed; no retry was attempted.");
    }
    if (signal.aborted) throw Error("Workforce model request cancelled.");
    return decodeWorkforceAgentResponse(response);
  };
}

// Explicitly constructed only by the manual synthetic harness after a relevant
// configuration fix is confirmed. Importing this file does not create a client.
export function configuredWorkforceAgentOpenAIModel() {
  if (!process.env.OPENAI_API_KEY) throw Error("OpenAI configuration is unavailable; no request was sent.");
  try {
    const client = new OpenAI({...openAIProxyTransport(), apiKey: process.env.OPENAI_API_KEY,
      baseURL: "https://api.openai.com/v1", maxRetries: 0, timeout: 30000, logLevel: "off"});
    return createWorkforceAgentOpenAIModel(client);
  } catch {
    throw Error("OpenAI transport configuration is unavailable; no request was sent.");
  }
}

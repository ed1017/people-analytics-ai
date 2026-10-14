// Test-only alias: production entrypoints still execute their real boundary calls.
export function withDatasetRequest(request: Request, handler: () => Promise<Response>) {
  return (globalThis as unknown as {__boundary: (r: Request, h: () => Promise<Response>) => Promise<Response>}).__boundary(request, handler);
}

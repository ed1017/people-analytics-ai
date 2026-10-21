import { loadOccupationalReferenceDetail, loadOccupationalReferenceIndex, isOccupationCode, unavailableReferenceDetail, unavailableReferenceIndex, type ReferenceReader } from "../../../lib/occupational-reference";
import { referenceReadDiagnostic } from "../../../lib/reference-source-diagnostics.mjs";

export const dynamic = "force-dynamic";

async function handleGET(request: Request) {
  const code = new URL(request.url).searchParams.get("occupation");
  const headers = { "Cache-Control": "no-store" };
  if (code !== null && !isOccupationCode(code)) return Response.json({ error: "Use an O*NET-SOC code such as 15-1252.00." }, { status: 400, headers });
  const unavailable = () => code ? unavailableReferenceDetail(code) : unavailableReferenceIndex();
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    console.warn("Reference source unavailable", JSON.stringify({ operation: "reference_select", source: "reference_client", category: "missing_configuration", httpStatus: null, code: null }));
    return Response.json(unavailable(), { headers });
  }
  try {
    const { supabaseServer } = await import("../../../lib/supabase-server");
    const stop = new AbortController();
    const signal = AbortSignal.any([request.signal, stop.signal, AbortSignal.timeout(15000)]);
    const reader: ReferenceReader = async ({ table, columns, order, equal, from, to }) => {
      if (stop.signal.aborted) return { data: null, error: true };
      let query = supabaseServer.from(table).select(columns).order(order).range(from, to);
      if (equal) query = query.eq(equal.column, equal.value);
      try {
        const result = await query.abortSignal(signal);
        if (result.error) {
          const diagnostic = referenceReadDiagnostic({ table, error: result.error, status: result.status, signal });
          console.warn("Reference source unavailable", JSON.stringify(diagnostic));
          if (diagnostic.category === "access_denied") stop.abort();
        }
        return { data: result.data as Record<string, unknown>[] | null, error: result.error };
      } catch (error) {
        const diagnostic = referenceReadDiagnostic({ table, error, status: undefined, signal });
        console.warn("Reference source unavailable", JSON.stringify(diagnostic));
        if (diagnostic.category === "access_denied") stop.abort();
        return { data: null, error: true };
      }
    };
    return Response.json(code ? await loadOccupationalReferenceDetail(reader, code) : await loadOccupationalReferenceIndex(reader), { headers });
  } catch (error) {
    console.warn("Reference source unavailable", JSON.stringify(referenceReadDiagnostic({ table: undefined, error, status: undefined, signal: undefined })));
    return Response.json(unavailable(), { headers });
  }
}

export async function GET(request: Request) {
  return withDatasetRequest(request, () => handleGET(request));
}
import { withDatasetRequest } from "@/lib/dataset-runtime";

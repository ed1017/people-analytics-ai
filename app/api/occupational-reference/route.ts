import { loadOccupationalReferenceDetail, loadOccupationalReferenceIndex, isOccupationCode, unavailableReferenceDetail, unavailableReferenceIndex, type ReferenceReader } from "../../../lib/occupational-reference";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("occupation");
  const headers = { "Cache-Control": "no-store" };
  if (code !== null && !isOccupationCode(code)) return Response.json({ error: "Use an O*NET-SOC code such as 15-1252.00." }, { status: 400, headers });
  const unavailable = () => code ? unavailableReferenceDetail(code) : unavailableReferenceIndex();
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) return Response.json(unavailable(), { headers });
  try {
    const { supabaseServer } = await import("../../../lib/supabase-server");
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(15000)]);
    const reader: ReferenceReader = async ({ table, columns, order, equal, from, to }) => {
      let query = supabaseServer.from(table).select(columns).order(order).range(from, to);
      if (equal) query = query.eq(equal.column, equal.value);
      const result = await query.abortSignal(signal);
      return { data: result.data as Record<string, unknown>[] | null, error: result.error };
    };
    return Response.json(code ? await loadOccupationalReferenceDetail(reader, code) : await loadOccupationalReferenceIndex(reader), { headers });
  } catch {
    return Response.json(unavailable(), { headers });
  }
}

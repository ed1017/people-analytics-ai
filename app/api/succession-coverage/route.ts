import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseServer } from "@/lib/supabase-server";
import {
  SUCCESSION_PUBLIC_FIELDS,
  validateSuccessionApiRequest,
  validateSuccessionRows,
} from "@/lib/succession-public-contract.mjs";

export const dynamic = "force-dynamic";

const VIEW_NAME =
  "succession_coverage_public_summary_v1";

const PUBLIC_SELECT =
  SUCCESSION_PUBLIC_FIELDS.join(",");

function unavailable() {
  return NextResponse.json(
    {
      error:
        "Succession summary is unavailable.",
    },
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(
  request: NextRequest
) {
  const requestValidation =
    validateSuccessionApiRequest({
      method: request.method,
      url: request.url,
      hasBody: request.body !== null,
    });

  if (!requestValidation.ok) {
    return NextResponse.json(
      {
        error: requestValidation.error,
      },
      {
        status: requestValidation.status,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  try {
    const { data, error } =
      await supabaseServer
        .from(VIEW_NAME)
        .select(PUBLIC_SELECT)
        .limit(2);

    if (error) {
      console.error(
        "Succession summary aggregate unavailable:",
        error.message
      );
      return unavailable();
    }

    const validation =
      validateSuccessionRows(data ?? []);

    if (!validation.ok) {
      console.error(
        "Succession summary contract rejected:",
        validation.error
      );
      return unavailable();
    }

    return NextResponse.json(
      validation.value,
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Succession summary API error:",
      error
    );
    return unavailable();
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Method not allowed." },
    {
      status: 405,
      headers: {
        Allow: "GET",
        "Cache-Control": "no-store",
      },
    }
  );
}

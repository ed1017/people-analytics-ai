import { withDatasetRequest } from "@/lib/dataset-runtime";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getStructuralPositionCatalog,
  runStructuralPositionScenario,
} from "@/lib/structural-position-scenario";
import type {
  StructuralPositionAction,
} from "@/lib/types";

export const dynamic = "force-dynamic";

async function handleGET() {
  try {
    const result =
      await getStructuralPositionCatalog();

    return NextResponse.json(
      result,
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load structural position catalog.",
      },
      { status: 500 }
    );
  }
}

async function handlePOST(
  request: NextRequest
) {
  try {
    const body = await request.json();
    const actions =
      Array.isArray(body?.actions)
        ? (body.actions as StructuralPositionAction[])
        : [];

    if (
      actions.length === 0 ||
      actions.length > 20
    ) {
      return NextResponse.json(
        {
          error:
            "Provide between 1 and 20 position actions.",
        },
        { status: 400 }
      );
    }
    const result =
      await runStructuralPositionScenario(
        actions
      );

    return NextResponse.json(
      result,
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Structural position scenario API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to run structural position scenario.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request?: Request) {
  return withDatasetRequest(request, () => handleGET());
}

export async function POST(request: NextRequest) {
  return withDatasetRequest(request, () => handlePOST(request));
}

import { withDatasetRequest } from "@/lib/dataset-runtime";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getPositionActionDefaults,
  runPositionActionScenario,
  type PositionActionScenarioRequest,
} from "@/lib/position-action-scenario";

export const dynamic = "force-dynamic";

async function handleGET() {
  try {
    const result =
      await getPositionActionDefaults();

    return NextResponse.json(
      result,
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load position action model.",
      },
      { status: 500 }
    );
  }
}

async function handlePOST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as
        PositionActionScenarioRequest;

    const result =
      await runPositionActionScenario(
        body ?? {}
      );

    return NextResponse.json(
      result,
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {    console.error(
      "Position action scenario API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to run position action scenario.",
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

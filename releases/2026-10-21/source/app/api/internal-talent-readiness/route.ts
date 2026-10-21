import { withDatasetRequest } from "@/lib/dataset-runtime";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getInternalTalentReadiness,
} from "@/lib/internal-talent-readiness";

export const dynamic = "force-dynamic";

async function handleGET(
  request: NextRequest
) {
  try {
    const jobProfile =
      request.nextUrl.searchParams.get(
        "job_profile"
      );

    if (!jobProfile) {
      return NextResponse.json(
        {
          error:
            "job_profile is required.",
        },
        { status: 400 }
      );
    }
    const result =
      await getInternalTalentReadiness(
        jobProfile
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
    const message =
      error instanceof Error
        ? error.message
        : "Failed to evaluate internal talent readiness.";

    const validationError =
      message.startsWith(
        "The selected job profile"
      );

    if (!validationError) {
      console.error(
        "Internal talent readiness API error:",
        error
      );
    }

    return NextResponse.json(
      { error: message },
      {
        status: validationError
          ? 400
          : 500,
      }
    );
  }
}

export async function GET(request: NextRequest) {
  return withDatasetRequest(request, () => handleGET(request));
}

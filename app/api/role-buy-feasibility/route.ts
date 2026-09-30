import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getRoleBuyFeasibility,
} from "@/lib/role-buy-feasibility";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest
) {
  try {
    const jobProfile =
      request.nextUrl.searchParams.get(
        "job_profile"
      );
    const requestedBuyRaw =
      request.nextUrl.searchParams.get(
        "requested_buy"
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
    const requestedBuy =
      requestedBuyRaw === null
        ? 0
        : Number(requestedBuyRaw);

    const result =
      await getRoleBuyFeasibility(
        jobProfile,
        requestedBuy
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
        : "Failed to evaluate role Buy feasibility.";

    const validationError =
      message.startsWith(
        "The selected job profile"
      );
    if (!validationError) {
      console.error(
        "Role Buy feasibility API error:",
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

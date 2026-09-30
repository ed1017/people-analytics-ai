import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  runWorkforceResponsePlan,
  type WorkforceResponsePlanRequest,
} from "@/lib/workforce-response-plan";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as
        WorkforceResponsePlanRequest;

    if (
      !Array.isArray(body?.actions) ||
      body.actions.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "At least one structural position action is required.",
        },
        { status: 400 }
      );
    }
    if (
      !body?.skill_code ||
      typeof body.skill_code !== "string"
    ) {
      return NextResponse.json(
        {
          error:
            "skill_code is required.",
        },
        { status: 400 }
      );
    }

    const result =
      await runWorkforceResponsePlan(
        body
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
        : "Failed to run workforce response plan.";

    const validationError =
      message.startsWith(
        "Borrow cannot"
      ) ||
      message.startsWith(
        "Automate cannot"
      ) ||
      message.startsWith(
        "The selected skill"
      );

    if (!validationError) {
      console.error(
        "Workforce response plan API error:",
        error
      );
    }

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: validationError
          ? 400
          : 500,
      }
    );
  }
}

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  runRoleWorkforceResponsePlan,
  type RoleWorkforceResponsePlanRequest,
} from "@/lib/role-workforce-response-plan";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as
        RoleWorkforceResponsePlanRequest;

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
      !body?.job_profile ||
      typeof body.job_profile !== "string"
    ) {
      return NextResponse.json(
        {
          error:
            "job_profile is required.",
        },
        { status: 400 }
      );
    }

    const result =
      await runRoleWorkforceResponsePlan(
        body
      );

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to run role workforce response plan.";

    const validationError =
      message.startsWith("Borrow cannot") ||
      message.startsWith("Automate cannot") ||
      message.startsWith("The selected job profile");

    if (!validationError) {
      console.error(
        "Role workforce response plan API error:",
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

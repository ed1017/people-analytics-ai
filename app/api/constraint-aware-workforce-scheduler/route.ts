import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  runConstraintAwareWorkforceScheduler,
  type ConstraintAwareWorkforceScheduleRequest,
} from "@/lib/constraint-aware-workforce-scheduler";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as
        ConstraintAwareWorkforceScheduleRequest;

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
      !Array.isArray(body?.allocations) ||
      body.allocations.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "At least one approved BU response allocation is required.",
        },
        { status: 400 }
      );
    }

    if (!body?.constraints) {
      return NextResponse.json(
        {
          error:
            "constraints are required.",
        },
        { status: 400 }
      );
    }

    const result =
      await runConstraintAwareWorkforceScheduler(
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
        : "Failed to generate constraint-aware workforce schedule.";

    const validationError =
      message.startsWith("At least one") ||
      message.startsWith(
        "constraints are required"
      ) ||
      message.startsWith("Scheduler month") ||
      message.startsWith("Constraint ") ||
      message.startsWith(
        "required_coverage_pct_by_deadline"
      ) ||
      message.startsWith(
        "Role-plan reconciliation target"
      ) ||
      message.startsWith(
        "Each role-plan reconciliation target"
      ) ||
      message.startsWith(
        "BU response allocation"
      ) ||
      message.startsWith(
        "Each BU and job-profile"
      ) ||
      message.startsWith("Borrow cannot") ||
      message.startsWith("Automate cannot");

    if (!validationError) {
      console.error(
        "Constraint-aware workforce scheduler API error:",
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

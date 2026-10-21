import { withDatasetRequest } from "@/lib/dataset-runtime";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  runTimePhasedWorkforceExecution,
  type TimePhasedWorkforceExecutionRequest,
} from "@/lib/time-phased-workforce-execution";

export const dynamic = "force-dynamic";

async function handlePOST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as
        TimePhasedWorkforceExecutionRequest;

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

    if (
      !Array.isArray(body?.schedule) ||
      body.schedule.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "At least one time-phased response schedule entry is required.",
        },
        { status: 400 }
      );
    }

    const result =
      await runTimePhasedWorkforceExecution(
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
        : "Failed to run time-phased workforce execution.";

    const validationError =
      message.startsWith("At least one") ||
      message.startsWith(
        "A time-phased"
      ) ||
      message.startsWith(
        "effective_month"
      ) ||
      message.startsWith(
        "Scheduled response"
      ) ||
      message.startsWith(
        "Scheduled response amounts"
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
        "Time-phased workforce execution API error:",
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

export async function POST(request: NextRequest) {
  return withDatasetRequest(request, () => handlePOST(request));
}

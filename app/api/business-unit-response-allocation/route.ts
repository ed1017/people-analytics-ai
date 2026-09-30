import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  runBusinessUnitResponseAllocation,
  type BusinessUnitResponseAllocationRequest,
} from "@/lib/business-unit-response-allocation";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as
        BusinessUnitResponseAllocationRequest;

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
            "At least one business-unit response allocation is required.",
        },
        { status: 400 }
      );
    }

    const result =
      await runBusinessUnitResponseAllocation(
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
        : "Failed to run business-unit response allocation.";

    const validationError =
      message.startsWith(
        "At least one"
      ) ||
      message.startsWith(
        "A business-unit"
      ) ||
      message.startsWith(
        "BU response allocation"
      ) ||
      message.startsWith(
        "Each BU and job-profile"
      ) ||
      message.startsWith(
        "The structural scenario"
      ) ||
      message.startsWith(
        "Role-plan reconciliation target"
      ) ||
      message.startsWith(
        "Each role-plan reconciliation target"
      ) ||
      message.startsWith("Borrow cannot") ||
      message.startsWith("Automate cannot");

    if (!validationError) {
      console.error(
        "Business-unit response allocation API error:",
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

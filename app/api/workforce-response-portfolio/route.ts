import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  runWorkforceResponsePortfolio,
  type WorkforceResponsePortfolioRequest,
} from "@/lib/workforce-response-portfolio";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as
        WorkforceResponsePortfolioRequest;

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
      !Array.isArray(body?.plans) ||
      body.plans.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "At least one role response plan is required.",
        },
        { status: 400 }
      );
    }

    const result =
      await runWorkforceResponsePortfolio(
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
        : "Failed to run workforce response portfolio.";
    const validationError =
      message.startsWith(
        "At least one"
      ) ||
      message.startsWith(
        "Each job profile"
      ) ||
      message.startsWith(
        "Portfolio role"
      ) ||
      message.startsWith(
        "The structural scenario"
      ) ||
      message.startsWith(
        "A workforce response portfolio"
      );

    if (!validationError) {
      console.error(
        "Workforce response portfolio API error:",
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

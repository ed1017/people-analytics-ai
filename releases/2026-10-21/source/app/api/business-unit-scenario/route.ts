import { withDatasetRequest } from "@/lib/dataset-runtime";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getBusinessUnitScenarioCatalog,
  runBusinessUnitScenario,
  type BusinessUnitScenarioRequest,
} from "@/lib/business-unit-scenario";

export const dynamic = "force-dynamic";

async function handleGET(request:Request) {
  const strictSupply=new URL(request.url).searchParams.get("staffing_target")==="1";
  try {
    const catalog =
      await getBusinessUnitScenarioCatalog(strictSupply);

    return NextResponse.json(
      catalog,
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
            : "Failed to load business-unit scenarios.",
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
        BusinessUnitScenarioRequest;

    if (
      !body?.business_unit ||
      typeof body.business_unit !==
        "string"
    ) {
      return NextResponse.json(
        {
          error:
            "business_unit is required.",
        },
        { status: 400 }
      );
    }    const strictSupply=request.nextUrl.searchParams.get("staffing_target")==="1";
    const result =
      await runBusinessUnitScenario(
        strictSupply?{business_unit:body.business_unit}:body, strictSupply
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
      "Business-unit scenario API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to run business-unit scenario.",
      },
      { status: 500 }
    );
  }
}
export async function GET(request: Request) {
  return withDatasetRequest(request, () => handleGET(request));
}

export async function POST(request: NextRequest) {
  return withDatasetRequest(request, () => handlePOST(request));
}

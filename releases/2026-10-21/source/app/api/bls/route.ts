import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SERIES = [
  {
    id: "LNS14000000",
    name: "U.S. Unemployment Rate",
    short_name: "Unemployment Rate",
    unit: "percent",
  },
  {
    id: "LNS11300000",
    name: "U.S. Labor Force Participation Rate",
    short_name: "Labor Force Participation",
    unit: "percent",
  },
  {
    id: "CES0000000001",
    name: "U.S. Total Nonfarm Employment",
    short_name: "Nonfarm Employment",
    unit: "thousands",
  },
] as const;

type BlsObservation = {
  year: string;
  period: string;
  periodName?: string;
  value: string;
};

type BlsSeries = {
  seriesID: string;
  data: BlsObservation[];
};

type BlsResponse = {
  status?: string;
  message?: string[];
  Results?: {
    series?: BlsSeries[];
  };
};

function observationDate(
  observation: BlsObservation
) {
  const month = Number(
    observation.period.replace("M", "")
  );

  if (
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return `${observation.year}-${String(
    month
  ).padStart(2, "0")}-01`;
}

export async function GET(request: Request) {
  try {
    const response = await fetch(
      "https://api.bls.gov/publicAPI/v1/timeseries/data/",
      {
        signal: request.signal,
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          seriesid: SERIES.map(
            (series) => series.id
          ),
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(
        `BLS request failed with HTTP ${response.status}.`
      );
    }

    const payload =
      (await response.json()) as BlsResponse;

    const returnedSeries =
      payload.Results?.series ?? [];

    const metrics = SERIES.map(
      (definition) => {
        const series =
          returnedSeries.find(
            (item) =>
              item.seriesID ===
              definition.id
          );

        const latest =
          series?.data?.find(
            (item) =>
              /^M(0[1-9]|1[0-2])$/.test(
                item.period
              )
          ) ?? null;

        const rawValue = latest
          ? Number(latest.value)
          : null;

        return {
          series_id: definition.id,
          name: definition.name,
          short_name:
            definition.short_name,
          unit: definition.unit,
          raw_value:
            rawValue !== null &&
            Number.isFinite(rawValue)
              ? rawValue
              : null,
          display_value:
            rawValue === null ||
            !Number.isFinite(rawValue)
              ? "Unavailable"
              : definition.unit ===
                  "percent"
                ? `${rawValue.toFixed(1)}%`
                : `${(
                    rawValue / 1000
                  ).toFixed(1)}M`,
          observation_date:
            latest
              ? observationDate(latest)
              : null,
        };
      }
    );

    const latestDate =
      metrics
        .map(
          (metric) =>
            metric.observation_date
        )
        .filter(
          (value): value is string =>
            Boolean(value)
        )
        .sort()
        .at(-1) ?? null;

    return NextResponse.json(
      {
        source:
          "U.S. Bureau of Labor Statistics",
        latest_date: latestDate,
        metrics,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("BLS API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load BLS data.",
      },
      { status: 500 }
    );
  }
}

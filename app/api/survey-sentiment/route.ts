import {readSurveySentiment} from "@/lib/survey-sentiment-reader";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return readSurveySentiment(request);
}

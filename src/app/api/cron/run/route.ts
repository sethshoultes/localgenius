import { NextRequest, NextResponse } from "next/server";
import { runJob, listJobs, getJobHistory } from "@/services/scheduler";

/**
 * GET /api/cron/run
 *
 * Universal cron entry point. Replaces the need for individual cron endpoints.
 * Secured with CRON_SECRET via Bearer token.
 *
 * Query params:
 *   ?job=<name>   — run a specific job
 *   (no param)    — list all registered jobs with recent history
 *
 * Vercel crons hit this endpoint with the job name, e.g.:
 *   /api/cron/run?job=weekly-digest
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
      { status: 401 }
    );
  }

  const jobName = request.nextUrl.searchParams.get("job");

  // If no job specified, return the registry + recent history
  if (!jobName) {
    const jobs = listJobs();
    const recentHistory = getJobHistory(undefined, 50);

    return NextResponse.json({
      data: {
        jobs,
        recentHistory,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Run the requested job
  const result = await runJob(jobName);

  const status = result.success ? 200 : 500;

  return NextResponse.json(
    {
      data: {
        job: jobName,
        ...result,
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

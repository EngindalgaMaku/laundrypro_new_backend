import { NextRequest, NextResponse } from "next/server";
import { PDFCleanupCron } from "../../../../lib/pdf-cleanup-cron";

// GET /api/admin/pdf-cleanup - Get cleanup status and statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "status") {
      // Get cleanup status
      const status = PDFCleanupCron.getStatus();
      const stats = await PDFCleanupCron.getCleanupStats();

      return NextResponse.json({
        success: true,
        status,
        stats,
        message: "PDF cleanup status retrieved successfully",
      });
    }

    if (action === "stats") {
      // Get only statistics
      const stats = await PDFCleanupCron.getCleanupStats();
      return NextResponse.json({
        success: true,
        stats,
        message: "PDF cleanup statistics retrieved successfully",
      });
    }

    // Default: return both status and stats
    const status = PDFCleanupCron.getStatus();
    const stats = await PDFCleanupCron.getCleanupStats();

    return NextResponse.json({
      success: true,
      status,
      stats,
      message: "PDF cleanup information retrieved successfully",
    });
  } catch (error: any) {
    console.error("PDF cleanup status error:", error);
    return NextResponse.json(
      {
        error: "Failed to get PDF cleanup information",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/pdf-cleanup - Trigger cleanup or manage cron job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, olderThanHours } = body;

    if (!action || typeof action !== "string") {
      return NextResponse.json(
        { error: "Action is required (cleanup, start, stop)" },
        { status: 400 }
      );
    }

    switch (action) {
      case "cleanup": {
        // Manual cleanup trigger
        const hours =
          olderThanHours && typeof olderThanHours === "number"
            ? olderThanHours
            : 24;

        if (hours < 1 || hours > 168) {
          // 1 hour to 7 days
          return NextResponse.json(
            { error: "olderThanHours must be between 1 and 168 (7 days)" },
            { status: 400 }
          );
        }

        console.log(
          `Manual PDF cleanup triggered for files older than ${hours} hours`
        );
        const result = await PDFCleanupCron.runCleanup(hours);

        return NextResponse.json({
          success: result.success,
          deletedCount: result.deletedCount,
          message: result.message,
          triggeredBy: "manual",
          olderThanHours: hours,
        });
      }

      case "start": {
        // Start the cron job
        PDFCleanupCron.start();
        const status = PDFCleanupCron.getStatus();

        return NextResponse.json({
          success: true,
          message: "PDF cleanup cron job started",
          status,
        });
      }

      case "stop": {
        // Stop the cron job
        PDFCleanupCron.stop();
        const status = PDFCleanupCron.getStatus();

        return NextResponse.json({
          success: true,
          message: "PDF cleanup cron job stopped",
          status,
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use 'cleanup', 'start', or 'stop'" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("PDF cleanup action error:", error);
    return NextResponse.json(
      {
        error: "Failed to execute PDF cleanup action",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/pdf-cleanup - Emergency cleanup (delete all PDFs)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const confirm = searchParams.get("confirm");

    if (confirm !== "true") {
      return NextResponse.json(
        {
          error: "Emergency cleanup requires confirmation",
          message: "Add ?confirm=true to delete all PDF files",
          warning: "This action cannot be undone",
        },
        { status: 400 }
      );
    }

    console.log("Emergency PDF cleanup triggered - deleting all PDF files");

    // Run cleanup with 0 hours (deletes all files)
    const result = await PDFCleanupCron.runCleanup(0);

    return NextResponse.json({
      success: result.success,
      deletedCount: result.deletedCount,
      message: `Emergency cleanup completed: ${result.message}`,
      warning: "All PDF files have been deleted",
      triggeredBy: "emergency",
    });
  } catch (error: any) {
    console.error("Emergency PDF cleanup error:", error);
    return NextResponse.json(
      {
        error: "Failed to execute emergency cleanup",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

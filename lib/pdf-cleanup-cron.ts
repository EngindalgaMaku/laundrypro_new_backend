import * as cron from "node-cron";
import { PDFService } from "./pdf-service";

export class PDFCleanupCron {
  private static isRunning = false;
  private static cronJob: any = null;

  /**
   * Start the PDF cleanup cron job
   * Runs every 6 hours to clean up PDF files older than 24 hours
   */
  static start(): void {
    if (this.cronJob) {
      console.log("PDF cleanup cron job is already running");
      return;
    }

    // Run every 6 hours: at 00:00, 06:00, 12:00, and 18:00
    this.cronJob = cron.schedule(
      "0 */6 * * *",
      async () => {
        await this.runCleanup();
      },
      {
        timezone: "Europe/Istanbul",
      }
    );

    console.log("PDF cleanup cron job started - runs every 6 hours");

    // Also run cleanup on startup after 1 minute delay
    setTimeout(() => {
      this.runCleanup();
    }, 60000);
  }

  /**
   * Stop the PDF cleanup cron job
   */
  static stop(): void {
    if (this.cronJob) {
      this.cronJob.destroy();
      this.cronJob = null;
      console.log("PDF cleanup cron job stopped");
    }
  }

  /**
   * Manually run the cleanup process
   */
  static async runCleanup(
    olderThanHours: number = 24
  ): Promise<{ success: boolean; deletedCount: number; message: string }> {
    if (this.isRunning) {
      return {
        success: false,
        deletedCount: 0,
        message: "Cleanup is already running",
      };
    }

    this.isRunning = true;

    try {
      console.log(
        `Starting PDF cleanup - removing files older than ${olderThanHours} hours`
      );

      const deletedCount = await PDFService.cleanupOldPDFs(olderThanHours);

      const message = `PDF cleanup completed: ${deletedCount} files deleted`;
      console.log(message);

      return {
        success: true,
        deletedCount,
        message,
      };
    } catch (error) {
      console.error("PDF cleanup failed:", error);
      return {
        success: false,
        deletedCount: 0,
        message: `Cleanup failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get cleanup status
   */
  static getStatus(): {
    isRunning: boolean;
    isScheduled: boolean;
    nextRun: string | null;
  } {
    return {
      isRunning: this.isRunning,
      isScheduled: !!this.cronJob,
      nextRun: this.cronJob
        ? "Every 6 hours (00:00, 06:00, 12:00, 18:00 Turkey time)"
        : null,
    };
  }

  /**
   * Get cleanup statistics
   */
  static async getCleanupStats(): Promise<{
    totalFiles: number;
    oldFiles: number;
    totalSize: string;
    oldFilesSize: string;
  }> {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");

      const tempDir = path.join(process.cwd(), "public", "temp", "invoices");

      try {
        const files = await fs.readdir(tempDir);
        const pdfFiles = files.filter((file) => file.endsWith(".pdf"));

        let totalSize = 0;
        let oldFilesSize = 0;
        let oldFilesCount = 0;
        const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

        for (const file of pdfFiles) {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);
          totalSize += stats.size;

          if (stats.mtime.getTime() < cutoffTime) {
            oldFilesCount++;
            oldFilesSize += stats.size;
          }
        }

        const formatBytes = (bytes: number) => {
          if (bytes === 0) return "0 Bytes";
          const k = 1024;
          const sizes = ["Bytes", "KB", "MB", "GB"];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return (
            parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
          );
        };

        return {
          totalFiles: pdfFiles.length,
          oldFiles: oldFilesCount,
          totalSize: formatBytes(totalSize),
          oldFilesSize: formatBytes(oldFilesSize),
        };
      } catch (error) {
        return {
          totalFiles: 0,
          oldFiles: 0,
          totalSize: "0 Bytes",
          oldFilesSize: "0 Bytes",
        };
      }
    } catch (error) {
      console.error("Failed to get cleanup stats:", error);
      throw error;
    }
  }
}

// Auto-start the cron job in production
if (process.env.NODE_ENV === "production") {
  PDFCleanupCron.start();
}

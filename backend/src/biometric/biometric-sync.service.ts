import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus, LeaveStatus } from '@prisma/client';
import { isWeekend, toDateOnlyKey } from '../common/date.utils';
import { getStatusFromWorkDurationMinutes } from '../common/attendance.utils';

interface BiometricEntry {
  employeeId: string;
  date: Date;
  inTime: Date | null;
  outTime: Date | null;
  inDoor: string | null;
  outDoor: string | null;
  duration: number; // in minutes
}

@Injectable()
export class BiometricSyncService {
  private readonly logger = new Logger(BiometricSyncService.name);

  constructor(private prisma: PrismaService) {}

  async processBiometricData(
    entries: BiometricEntry[],
    options?: { skipLogCreation?: boolean },
  ): Promise<any> {
    this.logger.log(`Processing ${entries.length} biometric entries...`);
    const skipLogCreation = options?.skipLogCreation ?? false;

    const results = {
      processed: 0,
      skipped: 0,
      errors: [],
    };

    // Group entries by employee and date
    const grouped = new Map<string, BiometricEntry[]>();
    const allDates: Date[] = [];

    for (const entry of entries) {
      const dateKey = toDateOnlyKey(entry.date);
      const key = `${entry.employeeId}_${dateKey}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
        allDates.push(entry.date);
      }
      grouped.get(key)!.push(entry);
    }

    const uniqueEmployeeIds = [...new Set(entries.map((e) => e.employeeId))];
    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

    // Batch fetch users by employee IDs
    const users = await this.prisma.user.findMany({
      where: { employeeId: { in: uniqueEmployeeIds } },
    });
    const userByEmployeeId = new Map(users.map((u) => [u.employeeId, u]));

    // Batch fetch holidays in date range
    const holidays = await this.prisma.holiday.findMany({
      where: { date: { gte: minDate, lte: maxDate } },
    });
    const holidayDateKeys = new Set(
      holidays.map((h) => toDateOnlyKey(h.date)),
    );

    // Batch fetch approved leaves overlapping date range for our users
    const userIds = users.map((u) => u.id);
    const leaves = await this.prisma.leaveApplication.findMany({
      where: {
        userId: { in: userIds },
        status: LeaveStatus.APPROVED,
        fromDate: { lte: maxDate },
        toDate: { gte: minDate },
      },
    });
    const leaveKeySet = new Set<string>();
    for (const leave of leaves) {
      const from = new Date(leave.fromDate);
      const to = new Date(leave.toDate);
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        leaveKeySet.add(`${leave.userId}_${toDateOnlyKey(d)}`);
      }
    }

    // Process each employee's daily data
    for (const [key, dateEntries] of grouped) {
      try {
        const [employeeId] = key.split('_');
        const date = dateEntries[0].date;
        const dateKey = toDateOnlyKey(date);

        const user = userByEmployeeId.get(employeeId);
        if (!user) {
          this.logger.warn(`User not found for employee ID: ${employeeId}`);
          results.skipped++;
          continue;
        }

        // Deduplicate entries (e.g. same file uploaded twice) so duration/attendance are not doubled
        const seenKey = new Set<string>();
        const uniqueEntries = dateEntries.filter((e) => {
          const k = `${e.inTime?.getTime() ?? 'n'}_${e.outTime?.getTime() ?? 'n'}_${e.duration}`;
          if (seenKey.has(k)) return false;
          seenKey.add(k);
          return true;
        });

        // Store biometric logs in batch (skip when entries came from existing logs)
        if (!skipLogCreation && uniqueEntries.length > 0) {
          await this.prisma.biometricLog.createMany({
            data: uniqueEntries.map((entry) => ({
              userId: user.id,
              date: entry.date,
              inTime: entry.inTime,
              outTime: entry.outTime,
              inDoor: entry.inDoor,
              outDoor: entry.outDoor,
              duration: entry.duration,
              rawData: entry as object,
              processed: false,
            })),
          });
        }

        const totalDurationMinutes = uniqueEntries.reduce(
          (sum, entry) => sum + entry.duration,
          0,
        );

        const sorted = [...uniqueEntries].sort((a, b) => {
          const aTime = a.inTime?.getTime() ?? 0;
          const bTime = b.inTime?.getTime() ?? 0;
          return aTime - bTime;
        });
        const firstIn = sorted[0]?.inTime ?? null;
        const lastOut = sorted[sorted.length - 1]?.outTime ?? null;

        let status: AttendanceStatus;
        if (isWeekend(date)) {
          status = AttendanceStatus.WEEKEND;
        } else if (holidayDateKeys.has(dateKey)) {
          status = AttendanceStatus.HOLIDAY;
        } else if (leaveKeySet.has(`${user.id}_${dateKey}`)) {
          status = AttendanceStatus.CASUAL_LEAVE;
        } else {
          status = getStatusFromWorkDurationMinutes(totalDurationMinutes);
        }

        await this.prisma.attendance.upsert({
          where: {
            userId_date: { userId: user.id, date },
          },
          update: {
            status,
            firstInTime: firstIn ?? undefined,
            lastOutTime: lastOut ?? undefined,
            totalDuration: totalDurationMinutes,
            biometricSynced: true,
          },
          create: {
            userId: user.id,
            date,
            status,
            firstInTime: firstIn ?? undefined,
            lastOutTime: lastOut ?? undefined,
            totalDuration: totalDurationMinutes,
            biometricSynced: true,
          },
        });

        await this.prisma.biometricLog.updateMany({
          where: {
            userId: user.id,
            date,
            processed: false,
          },
          data: { processed: true },
        });

        results.processed++;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.logger.error(`Error processing entry: ${err.message}`);
        results.errors.push({ key, error: err.message });
      }
    }

    this.logger.log(
      `Processing complete. Processed: ${results.processed}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`,
    );

    return results;
  }

  async syncBiometricDataForDate(date: Date): Promise<any> {
    this.logger.log(`Syncing biometric data for ${date.toDateString()}...`);

    // TODO: Fetch data from actual biometric system API
    // For now, this is a placeholder for manual uploads or API integration

    // Get unprocessed biometric logs for the date (include user for employeeId)
    const unprocessedLogs = await this.prisma.biometricLog.findMany({
      where: {
        date,
        processed: false,
      },
      include: {
        user: { select: { employeeId: true } },
      },
    });

    if (unprocessedLogs.length === 0) {
      this.logger.log('No unprocessed biometric data found');
      return { message: 'No data to process' };
    }

    // Convert to BiometricEntry format
    const entries: BiometricEntry[] = unprocessedLogs.map((log) => ({
      employeeId: log.user.employeeId,
      date: log.date,
      inTime: log.inTime,
      outTime: log.outTime,
      inDoor: log.inDoor,
      outDoor: log.outDoor,
      duration: log.duration,
    }));

    return this.processBiometricData(entries, { skipLogCreation: true });
  }

  async getUnprocessedLogs() {
    return this.prisma.biometricLog.findMany({
      where: { processed: false },
      include: {
        user: {
          select: {
            employeeId: true,
            name: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }
}

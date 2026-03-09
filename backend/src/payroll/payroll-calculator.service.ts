import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceStatus } from '@prisma/client';
import { isWeekend, toDateOnlyKey } from '../common/date.utils';

interface SalaryCalculation {
  baseSalary: number;
  workingDays: number;
  presentDays: number;
  casualLeaveDays: number;
  halfDays: number;
  lossOfPayDays: number;
  totalPayDays: number;
  grossEarnings: number;
  deductions: number;
  reimbursements: number;
  netSalary: number;
}

@Injectable()
export class PayrollCalculatorService {
  constructor(private prisma: PrismaService) { }

  /**
   * Working days for a specific user = active tenure days in month (joined to end or start to left)
   * minus weekends (Sat/Sun) minus company holidays.
   * Company operates in India only. Month is 1-12 (January = 1).
   */
  private async calculateWorkingDays(user: any, year: number, month: number): Promise<number> {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    const joinDate = new Date(user.dateOfJoining);
    const leaveDate = user.dateOfLeaving ? new Date(user.dateOfLeaving) : null;

    // Period the user was actually employed during this month
    const activeStart = joinDate > monthStart ? joinDate : monthStart;
    const activeEnd = (leaveDate && leaveDate < monthEnd) ? leaveDate : monthEnd;

    if (activeStart > monthEnd || (leaveDate && leaveDate < monthStart)) {
      return 0; // User was not employed during this month
    }
    const holidays = await this.prisma.holiday.findMany({
      where: {
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    const holidayDates = new Set(holidays.map((h) => toDateOnlyKey(h.date)));

    let workingDaysCount = 0;
    const current = new Date(activeStart);
    current.setHours(0, 0, 0, 0);
    const iterEnd = new Date(activeEnd);
    iterEnd.setHours(23, 59, 59, 999);

    while (current <= iterEnd) {
      const dateKey = toDateOnlyKey(current);
      if (!isWeekend(current) && !holidayDates.has(dateKey)) {
        workingDaysCount++;
      }
      current.setDate(current.getDate() + 1);
    }

    return workingDaysCount;
  }

  async calculateSalary(
    userId: string,
    year: number,
    month: number,
  ): Promise<SalaryCalculation> {
    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const baseSalary = Number(user.baseSalary);

    // Calculate working days for the specific user in this month
    const workingDays = await this.calculateWorkingDays(user, year, month);

    // Get attendance records for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Count different attendance statuses
    let presentDays = 0;
    let casualLeaveDays = 0;
    let halfDays = 0;
    let lossOfPayDays = 0;

    // Filter attendance to only include records within the user's tenure
    const joinDate = new Date(user.dateOfJoining);
    const leaveDate = user.dateOfLeaving ? new Date(user.dateOfLeaving) : null;

    attendanceRecords.forEach((record) => {
      const recordDate = new Date(record.date);

      // Basic tenure check (though attendance should theoretically only exist while active)
      if (recordDate < joinDate || (leaveDate && recordDate > leaveDate)) {
        return;
      }

      switch (record.status) {
        case AttendanceStatus.PRESENT:
          presentDays++;
          break;
        case AttendanceStatus.CASUAL_LEAVE:
          casualLeaveDays++;
          break;
        case AttendanceStatus.HALF_DAY:
          halfDays++;
          break;
        case AttendanceStatus.ABSENT:
          lossOfPayDays++;
          break;
      }
    });

    // Calculate total pay days
    const totalPayDays = presentDays + casualLeaveDays + halfDays * 0.5;

    // Calculate gross earnings (prorated); guard against no working days
    if (workingDays <= 0) {
      throw new Error(`No working days in ${year}-${month}; cannot calculate salary.`);
    }
    const grossEarnings = Math.round((totalPayDays / workingDays) * baseSalary);

    // Future: Add deductions and reimbursements
    const deductions = 0;
    const reimbursements = 0;

    const netSalary = grossEarnings - deductions + reimbursements;

    return {
      baseSalary,
      workingDays,
      presentDays,
      casualLeaveDays,
      halfDays,
      lossOfPayDays,
      totalPayDays,
      grossEarnings,
      deductions,
      reimbursements,
      netSalary,
    };
  }
}

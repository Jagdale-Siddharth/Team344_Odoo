import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'Finance', 'Human Resources', 'Operations', 'Customer Support', 'Legal'];
const JOB_POSITIONS = {
  Engineering: ['Software Engineer', 'Senior Software Engineer', 'QA Engineer', 'DevOps Engineer', 'Engineering Manager'],
  Sales: ['Sales Executive', 'Account Manager', 'Sales Manager', 'Business Development Rep'],
  Marketing: ['Marketing Specialist', 'Content Writer', 'SEO Analyst', 'Marketing Manager'],
  Finance: ['Financial Analyst', 'Accountant', 'Finance Manager'],
  'Human Resources': ['HR Executive', 'Recruiter', 'HR Manager'],
  Operations: ['Operations Executive', 'Operations Manager', 'Logistics Coordinator'],
  'Customer Support': ['Support Executive', 'Support Team Lead'],
  Legal: ['Legal Associate', 'Compliance Officer'],
};
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('Cleaning existing data...');
  await prisma.payslipLine.deleteMany();
  await prisma.payslip.deleteMany();
  await prisma.payrun.deleteMany();
  await prisma.salaryRule.deleteMany();
  await prisma.salaryStructure.deleteMany();
  await prisma.timeOffRequest.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.timeOffType.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.employee.updateMany({ data: { managerId: null, userId: null } });
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.workingSchedule.deleteMany();

  // -----------------------------------------------------------------
  // Working Schedules
  // -----------------------------------------------------------------
  console.log('Creating working schedules...');
  const fullTimeSchedule = await prisma.workingSchedule.create({
    data: {
      name: '40 Hours / Week',
      type: 'FULL_TIME',
      lines: {
        create: WEEKDAYS.map((day) => ({ day, startTime: '09:00', endTime: '18:00', breakMinutes: 60 })),
      },
    },
  });
  const partTimeSchedule = await prisma.workingSchedule.create({
    data: {
      name: '20 Hours / Week',
      type: 'PART_TIME',
      lines: {
        create: WEEKDAYS.slice(0, 4).map((day) => ({ day, startTime: '10:00', endTime: '15:00', breakMinutes: 30 })),
      },
    },
  });
  const flexSchedule = await prisma.workingSchedule.create({
    data: {
      name: 'Flexible Hours',
      type: 'FLEXIBLE',
      lines: {
        create: WEEKDAYS.map((day) => ({ day, startTime: '08:00', endTime: '17:00', breakMinutes: 45 })),
      },
    },
  });

  // -----------------------------------------------------------------
  // Salary Structure & Rules  ("Regular Salary")
  // -----------------------------------------------------------------
  console.log('Creating salary structure & rules...');
  const structure = await prisma.salaryStructure.create({
    data: { name: 'Regular Salary', description: 'Standard monthly salary structure', isActive: true },
  });

  await prisma.salaryRule.createMany({
    data: [
      { structureId: structure.id, name: 'Basic Salary', code: 'BASIC', category: 'BASIC', sequence: 10, computationMethod: 'FIXED' },
      { structureId: structure.id, name: 'House Rent Allowance', code: 'HRA', category: 'ALLOWANCE', sequence: 20, computationMethod: 'PERCENTAGE', percentage: 40, percentageBase: 'BASIC' },
      { structureId: structure.id, name: 'Conveyance Allowance', code: 'CONV', category: 'ALLOWANCE', sequence: 30, computationMethod: 'FIXED', amount: 1600 },
      { structureId: structure.id, name: 'Special Allowance', code: 'SPL', category: 'ALLOWANCE', sequence: 40, computationMethod: 'PERCENTAGE', percentage: 10, percentageBase: 'BASIC' },
      { structureId: structure.id, name: 'Provident Fund', code: 'PF', category: 'DEDUCTION', sequence: 50, computationMethod: 'PERCENTAGE', percentage: 12, percentageBase: 'BASIC' },
      { structureId: structure.id, name: 'Professional Tax', code: 'PT', category: 'DEDUCTION', sequence: 60, computationMethod: 'FIXED', amount: 200 },
      { structureId: structure.id, name: 'Gross Salary', code: 'GROSS', category: 'GROSS', sequence: 90, computationMethod: 'FORMULA', formula: 'basic + gross' },
    ],
  });

  const internStructure = await prisma.salaryStructure.create({
    data: { name: 'Intern Stipend', description: 'Simplified stipend structure for interns', isActive: true },
  });
  await prisma.salaryRule.createMany({
    data: [
      { structureId: internStructure.id, name: 'Basic Stipend', code: 'BASIC', category: 'BASIC', sequence: 10, computationMethod: 'FIXED' },
      { structureId: internStructure.id, name: 'Professional Tax', code: 'PT', category: 'DEDUCTION', sequence: 60, computationMethod: 'FIXED', amount: 0 },
    ],
  });

  // -----------------------------------------------------------------
  // Time Off Types
  // -----------------------------------------------------------------
  console.log('Creating time off types...');
  const toPaid = await prisma.timeOffType.create({ data: { name: 'Paid Time Off', unit: 'DAYS', requiresAllocation: true, approvalRequired: true, affectsPayroll: false, color: '#22c55e' } });
  const toSick = await prisma.timeOffType.create({ data: { name: 'Sick Leave', unit: 'DAYS', requiresAllocation: true, approvalRequired: true, affectsPayroll: false, color: '#f59e0b' } });
  const toUnpaid = await prisma.timeOffType.create({ data: { name: 'Unpaid Leave', unit: 'DAYS', requiresAllocation: false, approvalRequired: true, affectsPayroll: true, color: '#ef4444' } });
  const toWfh = await prisma.timeOffType.create({ data: { name: 'Work From Home', unit: 'DAYS', requiresAllocation: false, approvalRequired: true, affectsPayroll: false, color: '#3b82f6' } });

  // -----------------------------------------------------------------
  // Employees (200) + Users + Contracts + Attendance + Allocations
  // -----------------------------------------------------------------
  console.log('Creating 200 employees (this can take a bit)...');

  const managerIds = {};
  const employees = [];

  for (let i = 0; i < 200; i++) {
    const department = randomFrom(DEPARTMENTS);
    const positions = JOB_POSITIONS[department];
    const isManager = i < 24; // first 24 become department managers/leads
    const jobPosition = isManager ? positions[positions.length - 1] : randomFrom(positions.slice(0, -1));
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const name = `${firstName} ${lastName}`;
    const workEmail = `${firstName}.${lastName}${i}@peoplepay360.com`.toLowerCase();
    const employeeType = faker.helpers.weightedArrayElement([
      { value: 'FULL_TIME', weight: 80 },
      { value: 'PART_TIME', weight: 8 },
      { value: 'CONTRACT', weight: 7 },
      { value: 'INTERN', weight: 5 },
    ]);
    const schedule = employeeType === 'PART_TIME' ? partTimeSchedule : employeeType === 'INTERN' ? flexSchedule : fullTimeSchedule;
    const status = faker.helpers.weightedArrayElement([
      { value: 'ACTIVE', weight: 92 },
      { value: 'ON_LEAVE', weight: 5 },
      { value: 'INACTIVE', weight: 3 },
    ]);

    const employee = await prisma.employee.create({
      data: {
        name,
        workEmail,
        phone: faker.phone.number({ style: 'international' }),
        department,
        jobPosition,
        employeeType,
        status,
        dateJoined: faker.date.past({ years: 5 }),
        workingScheduleId: schedule.id,
        avatarColor: faker.color.rgb(),
      },
    });
    employees.push({ ...employee, isManager });
    if (isManager && !managerIds[department]) managerIds[department] = employee.id;
  }

  console.log('Assigning managers & creating auth users + contracts...');
  const password = await bcrypt.hash('Password@123', 10);
  const adminPassword = await bcrypt.hash('Admin@123', 10);

  // Admin + one of each staff role, not linked to an employee record
  await prisma.user.create({ data: { name: 'System Admin', email: 'admin@peoplepay360.com', password: adminPassword, role: 'ADMIN' } });
  await prisma.user.create({ data: { name: 'Priya HR Manager', email: 'hrmanager@peoplepay360.com', password: adminPassword, role: 'HR_MANAGER' } });
  await prisma.user.create({ data: { name: 'Rahul Payroll User', email: 'payrolluser@peoplepay360.com', password: adminPassword, role: 'HR_PAYROLL_USER' } });
  await prisma.user.create({ data: { name: 'Ananya Payroll Manager', email: 'payrollmanager@peoplepay360.com', password: adminPassword, role: 'HR_PAYROLL_MANAGER' } });

  const contractsData = [];
  for (const emp of employees) {
    if (!emp.isManager) {
      const dept = emp.department;
      const managerId = managerIds[dept] && managerIds[dept] !== emp.id ? managerIds[dept] : null;
      if (managerId) await prisma.employee.update({ where: { id: emp.id }, data: { managerId } });
    }

    // create login user for every employee (role EMPLOYEE)
    const user = await prisma.user.create({
      data: {
        name: emp.name,
        email: emp.workEmail,
        password,
        role: 'EMPLOYEE',
        employee: { connect: { id: emp.id } },
      },
    });

    const baseWage =
      emp.employeeType === 'INTERN'
        ? faker.number.int({ min: 12000, max: 20000 })
        : emp.employeeType === 'PART_TIME'
        ? faker.number.int({ min: 20000, max: 35000 })
        : emp.isManager
        ? faker.number.int({ min: 90000, max: 180000 })
        : faker.number.int({ min: 35000, max: 85000 });

    const structureId = emp.employeeType === 'INTERN' ? internStructure.id : structure.id;

    const contract = await prisma.contract.create({
      data: {
        reference: `CON/${new Date().getFullYear()}/${1000 + contractsData.length}`,
        employeeId: emp.id,
        department: emp.department,
        jobPosition: emp.jobPosition,
        startDate: emp.dateJoined,
        wage: baseWage,
        status: emp.status === 'INACTIVE' ? 'EXPIRED' : 'RUNNING',
        salaryStructureId: structureId,
      },
    });
    contractsData.push(contract);

    // Allocations (approved) for PTO & Sick Leave
    await prisma.allocation.create({
      data: { employeeId: emp.id, timeOffTypeId: toPaid.id, allocated: 18, taken: faker.number.int({ min: 0, max: 6 }), validFrom: new Date(new Date().getFullYear(), 0, 1), validTo: new Date(new Date().getFullYear(), 11, 31), status: 'APPROVED' },
    });
    await prisma.allocation.create({
      data: { employeeId: emp.id, timeOffTypeId: toSick.id, allocated: 10, taken: faker.number.int({ min: 0, max: 3 }), validFrom: new Date(new Date().getFullYear(), 0, 1), validTo: new Date(new Date().getFullYear(), 11, 31), status: 'APPROVED' },
    });

    // A few time off requests
    if (Math.random() < 0.35) {
      const start = faker.date.recent({ days: 40 });
      const end = new Date(start.getTime() + faker.number.int({ min: 0, max: 3 }) * 86400000);
      await prisma.timeOffRequest.create({
        data: {
          employeeId: emp.id,
          timeOffTypeId: randomFrom([toPaid.id, toSick.id, toWfh.id]),
          startDate: start,
          endDate: end,
          duration: Math.round((end - start) / 86400000) + 1,
          status: faker.helpers.weightedArrayElement([
            { value: 'APPROVED', weight: 60 },
            { value: 'SUBMITTED', weight: 30 },
            { value: 'REFUSED', weight: 10 },
          ]),
          reason: faker.lorem.sentence(4),
        },
      });
    }

    // Attendance for the last 30 days (skip weekends)
    const attendanceRows = [];
    for (let d = 30; d >= 1; d--) {
      const day = new Date();
      day.setDate(day.getDate() - d);
      if (day.getDay() === 0 || day.getDay() === 6) continue;
      if (Math.random() < 0.06) continue; // occasional absence, no record

      const checkInHour = faker.helpers.weightedArrayElement([
        { value: 9, weight: 70 },
        { value: 10, weight: 20 },
        { value: 11, weight: 10 },
      ]);
      const checkIn = new Date(day);
      checkIn.setHours(checkInHour, faker.number.int({ min: 0, max: 59 }), 0, 0);
      const workHours = faker.number.float({ min: 7, max: 10, fractionDigits: 1 });
      const checkOut = new Date(checkIn.getTime() + workHours * 3600000);

      const status = checkInHour >= 10 ? 'LATE' : workHours > 9 ? 'OVERTIME' : 'PRESENT';
      attendanceRows.push({
        employeeId: emp.id,
        checkIn,
        checkOut,
        workedHours: Math.round(workHours * 100) / 100,
        status,
      });
    }
    if (attendanceRows.length) await prisma.attendance.createMany({ data: attendanceRows });
  }

  console.log(`Seed complete: ${employees.length} employees, ${contractsData.length} contracts.`);
  console.log('\nLogin credentials:');
  console.log('  Admin:            admin@peoplepay360.com / Admin@123');
  console.log('  HR Manager:       hrmanager@peoplepay360.com / Admin@123');
  console.log('  HR Payroll User:  payrolluser@peoplepay360.com / Admin@123');
  console.log('  HR Payroll Mgr:   payrollmanager@peoplepay360.com / Admin@123');
  console.log('  Any employee:     <their work email> / Password@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

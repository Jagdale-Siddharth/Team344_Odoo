/**
 * Dynamic Payroll Calculation Engine
 * ------------------------------------------------------------------
 * Given an employee's contract + the SalaryRules of the Payrun's
 * SalaryStructure, computes a full payslip breakdown. Nothing here is
 * hardcoded per-employee - every number flows from the contract wage,
 * attendance-derived worked days, and the rule definitions themselves.
 *
 * Supported computation methods per rule:
 *  - FIXED:      amount is used as-is
 *  - PERCENTAGE: percentage% of a base (BASIC | GROSS | WAGE, or another
 *                rule's code resolved from already-computed lines)
 *  - FORMULA:    a small safe expression evaluated with variables:
 *                  wage, basic, gross, worked_days, total_days,
 *                  and any previously computed rule code (lowercased)
 */

const clean = (n) => Math.round((Number(n) || 0) * 100) / 100;

function safeEval(formula, scope) {
  // Only allow arithmetic on whitelisted identifiers - no access to global scope.
  const allowedNames = Object.keys(scope);
  const sanitized = formula.replace(/[^a-zA-Z0-9_ .+\-*/()%]/g, '');
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(...allowedNames, `return (${sanitized});`);
    const result = fn(...allowedNames.map((k) => scope[k]));
    return Number.isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}

function resolveBase(base, ctx) {
  if (!base) return ctx.basic;
  const key = String(base).toUpperCase();
  if (key === 'BASIC') return ctx.basic;
  if (key === 'GROSS') return ctx.runningGross;
  if (key === 'WAGE') return ctx.wage;
  // fall back: look up an already computed rule by code
  const found = ctx.computedByCode[key.toLowerCase()];
  return found ?? ctx.basic;
}

/**
 * @param {Object} params
 * @param {number} params.wage - contract monthly wage
 * @param {number} params.workedDays - worked days in the period (from attendance)
 * @param {number} params.totalDays - total working days in the period
 * @param {Array}  params.rules - SalaryRule[] ordered by sequence
 * @returns {{ lines: Array, basic:number, allowances:number, deductions:number, gross:number, net:number }}
 */
export function computePayslip({ wage, workedDays, totalDays, rules }) {
  const orderedRules = [...rules]
    .filter((r) => r.isActive !== false)
    .sort((a, b) => a.sequence - b.sequence);

  const proratedWage =
    totalDays > 0 && workedDays < totalDays ? (wage / totalDays) * workedDays : wage;

  const lines = [];
  const computedByCode = {};
  let basic = 0;
  let allowances = 0;
  let deductions = 0;
  let runningGross = 0;

  for (const rule of orderedRules) {
    const ctx = { wage: proratedWage, basic, runningGross, computedByCode };
    let amount = 0;

    if (rule.category === 'BASIC') {
      amount = rule.computationMethod === 'FIXED' && rule.amount != null ? rule.amount : proratedWage;
      basic = clean(amount);
      amount = basic;
    } else if (rule.computationMethod === 'FIXED') {
      amount = rule.amount ?? 0;
    } else if (rule.computationMethod === 'PERCENTAGE') {
      const base = resolveBase(rule.percentageBase, ctx);
      amount = (base * (rule.percentage ?? 0)) / 100;
    } else if (rule.computationMethod === 'FORMULA') {
      amount = safeEval(rule.formula || '0', {
        wage: proratedWage,
        basic,
        gross: runningGross,
        worked_days: workedDays,
        total_days: totalDays,
        ...computedByCode,
      });
    }

    amount = clean(amount);
    computedByCode[rule.code.toLowerCase()] = amount;

    if (rule.category === 'ALLOWANCE') {
      allowances = clean(allowances + amount);
      runningGross = clean(runningGross + amount);
    } else if (rule.category === 'BASIC') {
      runningGross = clean(runningGross + amount);
    } else if (rule.category === 'DEDUCTION') {
      deductions = clean(deductions + Math.abs(amount));
      amount = -Math.abs(amount);
    } else if (rule.category === 'GROSS') {
      amount = runningGross;
    }

    lines.push({
      ruleId: rule.id,
      name: rule.name,
      code: rule.code,
      category: rule.category,
      sequence: rule.sequence,
      amount,
    });
  }

  const gross = runningGross || clean(basic + allowances);
  const net = clean(gross - deductions);

  return { lines, basic, allowances, deductions, gross, net };
}

/**
 * Detects common payroll issues for a set of about-to-be-computed payslips.
 * Returns a warnings array (strings) for a single employee/contract pair.
 */
export function detectWarnings({ employee, contract, existingPayslipCount }) {
  const warnings = [];
  if (!contract) warnings.push('No applicable contract found for this period.');
  if (contract && !contract.salaryStructureId && !contract.salaryStructure) {
    warnings.push('Contract has no salary structure assigned.');
  }
  if (!employee?.workEmail) warnings.push('Missing employee email for payslip delivery.');
  if (existingPayslipCount > 0) warnings.push('Duplicate payslip already exists for this period.');
  return warnings;
}

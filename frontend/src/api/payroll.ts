import api from "./client";

export interface SalaryStructure {
  id: string;
  name: string;
  description: string | null;
  base_annual_ctc: number;
  is_active: boolean;
}

export interface EmployeeSalary {
  id: string;
  employee_id: string;
  effective_date: string;
  basic_salary: number;
  hra: number;
  conveyance_allowance: number;
  special_allowance: number;
  pf_deduction: number;
  esi_deduction: number;
  tds_tax_deduction: number;
  gross_salary: number;
  net_salary: number;
  is_active: boolean;
}

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  total_gross: number;
  total_net: number;
  total_deductions: number;
  status: "draft" | "approved" | "paid";
  notes: string | null;
  processed_at: string | null;
}

export interface Payslip {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  month: number;
  year: number;
  working_days: number;
  present_days: number;
  leave_days: number;
  basic_salary: number;
  hra: number;
  allowances: number;
  gross_salary: number;
  pf_deduction: number;
  tax_deduction: number;
  other_deductions: number;
  net_salary: number;
  status: string;
  paid_at: string | null;
}

export async function getSalaryStructures(): Promise<SalaryStructure[]> {
  const res = await api.get<SalaryStructure[]>("/payroll/structures");
  return res.data;
}

export async function createSalaryStructure(payload: { name: string; description?: string; base_annual_ctc: number }): Promise<SalaryStructure> {
  const res = await api.post<SalaryStructure>("/payroll/structures", payload);
  return res.data;
}

export async function getEmployeeSalaries(employee_id?: string): Promise<EmployeeSalary[]> {
  const res = await api.get<EmployeeSalary[]>("/payroll/employee-salaries", { params: { employee_id } });
  return res.data;
}

export async function assignEmployeeSalary(payload: {
  employee_id: string;
  effective_date: string;
  basic_salary: number;
  hra: number;
  conveyance_allowance: number;
  special_allowance: number;
  pf_deduction: number;
  esi_deduction: number;
  tds_tax_deduction: number;
}): Promise<EmployeeSalary> {
  const res = await api.post<EmployeeSalary>("/payroll/employee-salaries", payload);
  return res.data;
}

export async function getPayrollRuns(year?: number): Promise<PayrollRun[]> {
  const res = await api.get<PayrollRun[]>("/payroll/runs", { params: { year } });
  return res.data;
}

export async function processPayrollRun(payload: { month: number; year: number; notes?: string }): Promise<PayrollRun> {
  const res = await api.post<PayrollRun>("/payroll/runs/process", payload);
  return res.data;
}

export async function approvePayrollRun(run_id: string): Promise<PayrollRun> {
  const res = await api.patch<PayrollRun>(`/payroll/runs/${run_id}/approve`);
  return res.data;
}

export async function markPayrollPaid(run_id: string): Promise<PayrollRun> {
  const res = await api.patch<PayrollRun>(`/payroll/runs/${run_id}/pay`);
  return res.data;
}

export async function getPayslips(params?: { run_id?: string; employee_id?: string; month?: number; year?: number }): Promise<Payslip[]> {
  const res = await api.get<Payslip[]>("/payroll/payslips", { params });
  return res.data;
}

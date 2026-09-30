import api from "./client";

export interface Employee {
  id: string;
  organization_id: string;
  employee_code: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  joining_date: string | null;
  employment_status: string;
  employment_type?: string;
  department_id: string | null;
  designation_id: string | null;
  shift_id: string | null;
  user_id: string | null;
  branch_id?: string | null;
  reporting_manager_id?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  blood_group?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relation?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  bank_account_number?: string | null;
  bank_ifsc_code?: string | null;
  pan_number?: string | null;
  aadhar_number?: string | null;
}

export interface EmployeePayload {
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  joining_date?: string | null;
  employment_status?: string;
  employment_type?: string;
  department_id?: string | null;
  designation_id?: string | null;
  shift_id?: string | null;
  user_id?: string | null;
  branch_id?: string | null;
  reporting_manager_id?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  blood_group?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relation?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  bank_account_number?: string | null;
  bank_ifsc_code?: string | null;
  pan_number?: string | null;
  aadhar_number?: string | null;
  create_login_account?: boolean;
  temporary_password?: string;
  account_role?: string;
}

export async function getEmployees(params?: {
  department_id?: string;
  branch_id?: string;
  reporting_manager_id?: string;
  status?: string;
}): Promise<Employee[]> {
  const response = await api.get<Employee[]>("/employees", { params });
  return response.data;
}

export async function getEmployee(id: string): Promise<Employee> {
  const response = await api.get<Employee>(`/employees/${id}`);
  return response.data;
}

export async function createEmployee(payload: EmployeePayload): Promise<Employee> {
  const response = await api.post<Employee>("/employees", payload);
  return response.data;
}

export async function updateEmployee(id: string, payload: Partial<EmployeePayload>): Promise<Employee> {
  const response = await api.patch<Employee>(`/employees/${id}`, payload);
  return response.data;
}

export async function deactivateEmployee(id: string): Promise<void> {
  await api.delete(`/employees/${id}`);
}

export async function createEmployeeLoginAccount(
  employeeId: string,
  password: string,
  role: string = "EMPLOYEE",
): Promise<{ message: string; username: string; email: string }> {
  const response = await api.post(`/employees/${employeeId}/create-account`, { password, role });
  return response.data;
}

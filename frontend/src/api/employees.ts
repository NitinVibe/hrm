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
  department_id: string | null;
  designation_id: string | null;
  shift_id: string | null;
  user_id: string | null;
}

export interface EmployeePayload {
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  joining_date?: string | null;
  employment_status?: string;
  department_id?: string | null;
  designation_id?: string | null;
  shift_id?: string | null;
  user_id?: string | null;
}

export async function getEmployees(): Promise<Employee[]> {
  const response = await api.get<Employee[]>("/employees");
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

export async function deactivateEmployee(id: string): Promise<Employee> {
  const response = await api.delete<Employee>(`/employees/${id}`);
  return response.data;
}

export interface StoreEmployee {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: "OWNER" | "ADMIN" | "STAFF" | "VIEWER";
  roleLabel: string;
  department: string | null;
  capabilities: string[];
  isActive: boolean;
}

export interface PersonalAccount {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  membership: "ACTIVE" | "INACTIVE" | null;
}

export type EmployeeFilter = "ALL" | "ACTIVE" | "INACTIVE";

export function employeeJob(employee: StoreEmployee) {
  if (employee.role === "OWNER") return "Дэлгүүрийн эзэмшигч";
  if (employee.role === "ADMIN") return "Менежер";
  if (employee.capabilities.includes("POS_CASHIER")) return "Кассын ажилтан";
  return employee.roleLabel;
}

export function employeeAccess(employee: StoreEmployee) {
  if (employee.role === "OWNER") return "Дэлгүүрийн бүх эрх";
  if (employee.role === "ADMIN") return "Борлуулалт, бараа, захиалга";
  if (employee.capabilities.includes("POS_CASHIER")) {
    return employee.capabilities.length > 1
      ? "POS касс болон нэмэлт эрх"
      : "POS касс · Барааны үлдэгдэл";
  }
  return employee.capabilities.length
    ? "Тусгай эрх оноосон"
    : "Кассын эрх оноогоогүй";
}

export interface EmployeeSummary {
  total: number;
  active: number;
  inactive: number;
  cashiers: number;
}

export function isCashier(employee: StoreEmployee) {
  return (
    employee.role !== "OWNER" &&
    employee.role !== "ADMIN" &&
    employee.capabilities.includes("POS_CASHIER")
  );
}

export function summarizeEmployees(
  employees: readonly StoreEmployee[],
): EmployeeSummary {
  const summary: EmployeeSummary = {
    total: employees.length,
    active: 0,
    inactive: 0,
    cashiers: 0,
  };
  for (const employee of employees) {
    if (employee.isActive) {
      summary.active++;
      if (isCashier(employee)) summary.cashiers++;
    } else {
      summary.inactive++;
    }
  }
  return summary;
}

export function filterEmployees(
  employees: readonly StoreEmployee[],
  query: string,
  filter: EmployeeFilter,
) {
  const term = query.trim().toLocaleLowerCase();
  return employees.filter((employee) => {
    const matchesStatus =
      filter === "ALL" || employee.isActive === (filter === "ACTIVE");
    const identity = `${employee.fullName} ${employee.email} ${employee.phone || ""} ${employeeJob(employee)}`;
    return matchesStatus && identity.toLocaleLowerCase().includes(term);
  });
}

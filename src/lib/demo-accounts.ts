// Shared between the sign in screen and the seeding function.
export const DEMO_PASSWORD = "Demo@2026!";

export const DEMO_ACCOUNTS = [
  { key: "super", role: "super_admin", name: "Chief Registrar", email: "super@uni.demo", label: "Super admin" },
  { key: "deptAdmin", role: "dept_admin", name: "Prof. Grace Okafor", email: "csc.admin@uni.demo", label: "Department admin" },
  { key: "lecturer", role: "lecturer", name: "Samuel Adeyemi", email: "lecturer@uni.demo", label: "Lecturer" },
  { key: "student", role: "student", name: "Ada Nwosu", email: "student@uni.demo", label: "Student" },
  { key: "lecturer2", role: "lecturer", name: "Amina Bello", email: "lecturer2@uni.demo", label: "Lecturer 2" },
  { key: "student2", role: "student", name: "Tunde Bakare", email: "student2@uni.demo", label: "Student 2" },
  { key: "mthAdmin", role: "dept_admin", name: "Dr. Chinedu Eze", email: "mth.admin@uni.demo", label: "Maths admin" },
] as const;

export type JobApplication = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  registerNumber: string | null;
  age: number | null;
  gender: string | null;
  address: string | null;
  jobPosition: string | null;
  education: string | null;
  salaryExpect: string | null;
  experience: string | null;
  professionalSkills: string | null;
  personalSkills: string | null;
  languages: string | null;
  status: string;
  createdAt: string;
};

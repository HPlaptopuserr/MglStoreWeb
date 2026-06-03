export type HrForm = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  fields: Array<{
    id: string;
    type: string;
    label: string;
    required: boolean;
    options?: { id: string; value: string }[];
    placeholder?: string;
  }>;
};

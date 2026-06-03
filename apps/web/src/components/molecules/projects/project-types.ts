export type ProjectItem = {
  id: string;
  title: string;
  category?: string;
  summary?: string;
  details?: string;
  price?: number;
  imageUrl?: string;
  imageUrls?: string[];
  pdfUrl?: string;
  tags?: string[];
  isActive?: boolean;
  isFeatured?: boolean;
};

export type ProjectShowcaseSection = {
  id: string;
  title: string;
  subtitle?: string;
  projectIds: string[];
};

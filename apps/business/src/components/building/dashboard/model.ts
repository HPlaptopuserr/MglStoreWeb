export interface DashboardData {
 totals: Record<string, number>;
 blocks: {id:string;name:string;projectId:string;projectTitle:string;floors:number;total:number;sold:number;available:number}[];
 finance: {agreed:string;paid:string;remaining:string;due:string;monthPaid:string;overdue:string;reservations:number;missingPrices:number};
 overdue: {id:string;reference:string;customer:string;phone:string|null;block:string;projectId:string;unit:string;amount:string;dueDate:string;days:number}[];
 updatedAt:string;
}
export const currency = (value: string | number) => `${Number(value).toLocaleString('mn-MN', {maximumFractionDigits: 0})} ₮`;
export const percentage = (paid: string | number, total: string | number) => Number(total) > 0 ? Math.min(100, Number(paid) / Number(total) * 100) : 0;

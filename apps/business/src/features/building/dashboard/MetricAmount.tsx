import { currency } from "./model";
export function MetricAmount({ value }: { value: string }) {
  const amount = Number(value);
  const divisor = amount >= 1e9 ? 1e9 : amount >= 1e6 ? 1e6 : 1;
  return (
    <strong className="erp-value" title={currency(value)}>
      {(amount / divisor).toLocaleString("mn-MN", {
        maximumFractionDigits: divisor === 1 ? 0 : 1,
      })}
      <small>
        {divisor === 1e9 ? "Тэрбум ₮" : divisor === 1e6 ? "Сая ₮" : "₮"}
      </small>
    </strong>
  );
}

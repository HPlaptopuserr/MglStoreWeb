import { MutableRefObject } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";

export type QrGeneratorMode = "svg" | "canvas";

export interface QrGeneratorProps {
  value: string;
  size?: number;
  mode?: QrGeneratorMode;
  bgColor?: string;
  fgColor?: string;
  level?: "L" | "M" | "Q" | "H";
  includeMargin?: boolean;
  canvasRef?: MutableRefObject<HTMLCanvasElement | null>;
  className?: string;
}

export function QrGenerator({
  value,
  size = 200,
  mode = "svg",
  bgColor = "#ffffff",
  fgColor = "#111827",
  level = "M",
  includeMargin = true,
  canvasRef,
  className,
}: QrGeneratorProps) {
  if (mode === "canvas") {
    return (
      <QRCodeCanvas
        ref={canvasRef || undefined}
        value={value}
        size={size}
        bgColor={bgColor}
        fgColor={fgColor}
        level={level}
        includeMargin={includeMargin}
        className={className}
      />
    );
  }

  return (
    <QRCodeSVG
      value={value}
      size={size}
      bgColor={bgColor}
      fgColor={fgColor}
      level={level}
      includeMargin={includeMargin}
      className={className}
    />
  );
}

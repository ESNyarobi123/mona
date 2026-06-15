import Image from "next/image";

const FULL_LOGO = "/brand/monana-logo.png";
const MARK_LOGO = "/brand/monana-mark.png";

type Props = {
  /** Full logo (M + Monana text) or circular M mark */
  variant?: "full" | "mark";
  /** Height in px — width scales automatically */
  height?: number;
  className?: string;
  priority?: boolean;
};

export function MonanaLogo({
  variant = "mark",
  height = 40,
  className = "",
  priority = false,
}: Props) {
  const src = variant === "full" ? FULL_LOGO : MARK_LOGO;
  const width = variant === "full" ? Math.round(height * 1.05) : height;

  return (
    <Image
      src={src}
      alt="Monana"
      width={width}
      height={height}
      className={`monana-logo monana-logo--${variant}${className ? ` ${className}` : ""}`}
      priority={priority}
    />
  );
}

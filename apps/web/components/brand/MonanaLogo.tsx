import Image from "next/image";

/** Full brand lockup (M + Monana FOOD + tagline) */
const FULL_LOGO = "/logo/image.png";
/** Compact circular M mark for tight UI (admin, avatars) */
const MARK_LOGO = "/brand/monana-mark.png";

/** Intrinsic aspect of /logo/image.png */
const FULL_ASPECT = 1199 / 896;

type Props = {
  /** Full logo (M + Monana FOOD) or circular M mark */
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
  const width = variant === "full" ? Math.round(height * FULL_ASPECT) : height;

  return (
    <Image
      src={src}
      alt="Monana FOOD"
      width={width}
      height={height}
      className={`monana-logo monana-logo--${variant}${className ? ` ${className}` : ""}`}
      priority={priority}
    />
  );
}

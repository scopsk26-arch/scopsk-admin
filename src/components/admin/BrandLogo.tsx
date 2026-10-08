import { cn } from "@/lib/utils";
import { BRAND_LOGOS, type BrandLogoVariant } from "@/lib/brand";
import { useTheme } from "@/components/admin/ThemeProvider";

type BrandLogoProps = {
  className?: string;
  alt?: string;
  /** Force a variant; default follows admin theme (dark → cream mark). */
  variant?: BrandLogoVariant | "auto";
};

export function BrandLogo({
  className,
  alt = "ScopsK",
  variant = "auto",
}: BrandLogoProps) {
  const { theme } = useTheme();
  const resolved: BrandLogoVariant =
    variant === "auto" ? (theme === "dark" ? "onDark" : "onLight") : variant;

  return (
    <img
      src={BRAND_LOGOS[resolved]}
      alt={alt}
      className={cn("h-10 w-auto max-w-[220px] object-contain object-left", className)}
    />
  );
}

import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";
import respyLogoLight from "@/assets/respy-logo-light.png";
import respyLogoDark from "@/assets/respy-logo-dark.png";

type BrandLogoProps = {
  className?: string;
  alt?: string;
};

/** Official ResPy wordmark — light/dark variants from brand assets. */
export function BrandLogo({ className, alt = "ResPy" }: BrandLogoProps) {
  const { theme } = useTheme();
  return (
    <img
      src={theme === "dark" ? respyLogoDark : respyLogoLight}
      alt={alt}
      className={cn("h-10 w-auto max-w-[200px] object-contain object-left", className)}
    />
  );
}

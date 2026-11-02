// Import Dependencies
import { lazy, Suspense } from "react";

// Local Imports
import { useThemeContext } from "app/contexts/theme/context";
import { SplashScreen } from "components/template/SplashScreen";

// ----------------------------------------------------------------------

const MainLayout = lazy(() => import("./MainLayout"));
const SideblockLayout = lazy(() => import("./Sideblock"));

export function DynamicLayout() {
  const { themeLayout } = useThemeContext();

  const CurrentLayout = themeLayout === "sideblock" ? SideblockLayout : MainLayout;

  return (
    <Suspense fallback={<SplashScreen />}>
      <CurrentLayout />
    </Suspense>
  );
}

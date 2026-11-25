// Import Dependencies
import { createBrowserRouter, createHashRouter } from "react-router";

// Local Imports
import Root from "app/layouts/Root";
import RootErrorBoundary from "app/pages/errors/RootErrorBoundary";
import { SplashScreen } from "components/template/SplashScreen";
import { protectedRoutes } from "./protected";
import { ghostRoutes } from "./ghost";
import { publicRoutes } from "./public";

// ----------------------------------------------------------------------

const isElectron =
  typeof window !== "undefined" &&
  (Boolean(window.electronAPI) ||
    window.navigator.userAgent.includes("Electron") ||
    window.location.protocol === "file:");

const createRouter = isElectron ? createHashRouter : createBrowserRouter;

const router = createRouter([
  {
    id: "root",
    Component: Root,
    hydrateFallbackElement: <SplashScreen />,
    ErrorBoundary: RootErrorBoundary,
    children: [protectedRoutes, ghostRoutes, publicRoutes],
  },
]);

export default router;

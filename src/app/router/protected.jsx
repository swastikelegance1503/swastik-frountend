// Import Dependencies
import { Navigate } from "react-router";

// Local Imports
import { AppLayout } from "app/layouts/AppLayout";
import { DynamicLayout } from "app/layouts/DynamicLayout";
import AuthGuard from "middleware/AuthGuard";

// ----------------------------------------------------------------------

const protectedRoutes = {
  id: "protected",
  Component: AuthGuard,
  children: [
    // The dynamic layout supports both the main layout and the sideblock.
    {
      Component: DynamicLayout,
      children: [
        {
          index: true,
          element: <Navigate to="/dashboards" />,
        },
        {
          path: "dashboards",
          children: [
            {
              index: true,
              element: <Navigate to="/dashboards/home" />,
            },
            {
              path: "home",
              lazy: async () => ({
                Component: (await import("app/pages/dashboards/home")).default,
              }),
            },
            {
              path: "challans",
              lazy: async () => ({
                Component: (await import("app/pages/dashboards/challans")).default,
              }),
            },
          ],
        },
        {
          path: "challans",
          element: <Navigate to="/dashboards/challans" replace />,
        },
        {
          path: "merchants",
          lazy: async () => ({
            Component: (await import("app/pages/merchants")).default,
          }),
        },
        {
          path: "workers",
          lazy: async () => ({
            Component: (await import("app/pages/workers")).default,
          }),
        },
        {
          path: "workers/salary",
          lazy: async () => ({
            Component: (await import("app/pages/workers-salary")).default,
          }),
        },
        {
          path: "workers-salary",
          element: <Navigate to="/workers/salary" replace />,
        },
        {
          path: "production",
          element: <Navigate to="/machine-production" replace />,
        },
        {
          path: "machines",
          lazy: async () => ({
            Component: (await import("app/pages/machines")).default,
          }),
        },
        {
          path: "machine-production",
          lazy: async () => ({
            Component: (await import("app/pages/machine-production")).default,
          }),
        },
      ],
    },
    // The app layout supports only the main layout. Avoid using it for other layouts.
    {
      Component: AppLayout,
      children: [
        {
          path: "settings",
          lazy: async () => ({
            Component: (await import("app/pages/settings/Layout")).default,
          }),
          children: [
            {
              index: true,
              element: <Navigate to="/settings/general" />,
            },
            {
              path: "general",
              lazy: async () => ({
                Component: (await import("app/pages/settings/sections/General"))
                  .default,
              }),
            },
            {
              path: "appearance",
              lazy: async () => ({
                Component: (
                  await import("app/pages/settings/sections/Appearance")
                ).default,
              }),
            },
          ],
        },
      ],
    },
  ],
};

export { protectedRoutes };

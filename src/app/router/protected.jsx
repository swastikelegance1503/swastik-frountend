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
                Component: (await import("app/pages/delivery-challans")).default,
              }),
            },
            {
              path: "bills",
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
          path: "bills",
          element: <Navigate to="/dashboards/bills" replace />,
        },
        {
          path: "merchants",
          lazy: async () => ({
            Component: (await import("app/pages/merchants")).default,
          }),
        },
        {
          path: "workers",
          element: <Navigate to="/dashboards" replace />,
        },
        {
          path: "workers/salary",
          element: <Navigate to="/dashboards" replace />,
        },
        {
          path: "workers-salary",
          element: <Navigate to="/dashboards" replace />,
        },
        {
          path: "machines",
          element: <Navigate to="/dashboards" replace />,
        },
        {
          path: "machine-production",
          element: <Navigate to="/dashboards" replace />,
        },
        {
          path: "production",
          element: <Navigate to="/dashboards" replace />,
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

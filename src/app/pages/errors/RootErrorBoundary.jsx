// Import Dependencies
import { isRouteErrorResponse, useRouteError } from "react-router";
import { lazy, Suspense } from "react";

// ----------------------------------------------------------------------

const Error401 = lazy(() => import("./401"));
const Error404 = lazy(() => import("./404"));
const Error429 = lazy(() => import("./429"));
const Error500 = lazy(() => import("./500"));

const errorComponents = {
  401: Error401,
  404: Error404,
  429: Error429,
  500: Error500,
};

function RootErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    const Component = errorComponents[error.status] || Error500;
    return (
      <Suspense fallback={null}>
        <Component />
      </Suspense>
    );
  }

  return <div>Something went wrong</div>;
}

export default RootErrorBoundary;

import { createRootRoute, Outlet } from "@tanstack/react-router";

import Layout from "@/components/Layout";
import NotFound from "@/pages/NotFound";

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

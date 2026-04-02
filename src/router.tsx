import { createBrowserRouter } from "react-router-dom";

import Layout from "@/components/Layout";
import History from "@/pages/History";
import Home from "@/pages/Home";
import NotFound from "@/pages/NotFound";
import Room from "@/pages/Room";

const router = createBrowserRouter([
  {
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/room/:roomCode/*",
        element: <Room />,
      },
      {
        path: "/history",
        element: <History />,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
    element: <Layout />,
  },
]);

export default router;

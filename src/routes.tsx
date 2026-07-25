import type { ReactElement } from "react";
import { Route, Routes } from "react-router-dom";
import { appRoutes } from "./routes/index";

export function AppRoutes(): ReactElement {
  return (
    <Routes>
      {appRoutes.map((route) => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}
    </Routes>
  );
}

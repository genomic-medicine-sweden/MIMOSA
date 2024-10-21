import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AppWrapper from "./AppWrapper"; 

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <AppWrapper />
  </StrictMode>
);


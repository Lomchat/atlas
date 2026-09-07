import React from "react";
import { createRoot } from "react-dom/client";
import AtlasApplication from "./AtlasApplication";
import "./style.css";
import "./StudioLayout.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AtlasApplication />
  </React.StrictMode>,
);

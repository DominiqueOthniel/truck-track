import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found. Make sure there is a <div id='root'></div> in your HTML.");
}

// Gestion des erreurs globales
window.addEventListener("error", (event) => {
  console.error("Erreur globale:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Promesse rejetée non gérée:", event.reason);
});

try {
  const root = createRoot(rootElement);
  root.render(<App />);
} catch (error) {
  console.error("Erreur lors du rendu de l'application:", error);
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h1 style="color: red;">Erreur lors du chargement de l'application</h1>
      <p>Une erreur s'est produite. Veuillez consulter la console pour plus de détails.</p>
      <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">
        ${error instanceof Error ? error.message : String(error)}
      </pre>
    </div>
  `;
}

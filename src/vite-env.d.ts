declare module "@vitejs/plugin-react" {
  import type { PluginOption } from "vite";

  const react: () => PluginOption;
  export default react;
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O canto inferior esquerdo é o rodapé do menu (usuário e "Sair")
  devIndicators: { position: 'bottom-right' },
  experimental: {
    // As telas buscam os dados da API no navegador (depois do login), então não são "instant"
    // por natureza. Só valida segmentos que pedirem explicitamente com `export const instant`.
    instantInsights: { validationLevel: 'manual-warning' },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

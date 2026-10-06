export interface Project {
  name: string;
  tagline: string;
  description: string;
  tags: string[];
  url?: string;
  repo?: string;
  featured: boolean;
  span?: "col" | "row" | "both" | "none";
}

export const projects: Project[] = [
  {
    name: "Vegord / Vegorde",
    tagline: "Native network optimization system",
    description:
      "A Rust-based architecture that replaces Electron overhead. Implements advanced TLS fragmentation, DNS-over-HTTPS, and ISP-aware smart routing to bypass restrictions with minimal latency.",
    tags: ["Rust", "TLS", "DoH", "Smart Routing"],
    featured: true,
    span: "both",
  },
  {
    name: "BidandoonVPN",
    tagline: "Cross-platform VPN client",
    description:
      "Flutter & Dart VPN client with custom UI/UX, subscription management, 3x-ui backend integration, and robust proxy configuration for Android and Linux.",
    tags: ["Flutter", "Dart", "Xray", "VLESS", "gRPC"],
    featured: true,
    span: "none",
  },
  {
    name: "Intel Arc B580 RGB RE",
    tagline: "Hardware reverse engineering",
    description:
      "Deep-dive investigation into the ASRock Steel Legend Intel Arc B580. Analyzed I2C bus, PCI device registers, and Nuvoton MCU firmware to enable open-source RGB control via OpenRGB.",
    tags: ["Reverse Engineering", "I2C", "SMBus", "OpenRGB"],
    featured: true,
    span: "none",
  },
  {
    name: "Arman Music",
    tagline: "AI-powered music discovery",
    description:
      "AI-powered music discovery platform and CLI tool. Integrates local LLMs for natural-language playlist generation, multi-source music aggregation, and metadata extraction.",
    tags: ["AI", "LLM", "RAG", "Rust CLI"],
    featured: true,
    span: "none",
  },
];

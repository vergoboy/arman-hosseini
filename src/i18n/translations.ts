/**
 * All user-facing text lives here, in both languages.
 *
 * - `useTranslations(lang)` returns the full dictionary for rich content
 *   (arrays, timeline entries, project copy).
 * - `t('nav.about', lang)` resolves a dotted string key.
 *
 * English is the source of truth for the shape: `fa` is typed as `typeof en`,
 * so adding a key in one language without the other is a type error.
 */
import type { BrandIconName } from '../data/site';

export const languages = ['en', 'fa'] as const;
export type Lang = (typeof languages)[number];

export const defaultLang: Lang = 'en';

/** Writing direction per language. */
export const dir: Record<Lang, 'ltr' | 'rtl'> = { en: 'ltr', fa: 'rtl' };

/** BCP-47 tags used on <html lang> and hreflang. */
export const htmlLang: Record<Lang, string> = { en: 'en', fa: 'fa' };

/** Site routes, relative to the language root. */
export const navRoutes = {
  home: '',
  about: 'about',
  projects: 'projects',
  journal: 'journal',
  contact: 'contact',
} as const;

export interface TimelineEntry {
  period: string;
  title: string;
  body: string;
}

export interface TechGroup {
  group: string;
  items: string[];
}

export interface ContactMethod {
  id: string;
  label: string;
  handle: string;
  /** Terminal-style command shown on the card. */
  command: string;
  note: string;
  icon: BrandIconName;
  /** Omitted for handles with no public profile URL (e.g. Discord). */
  href?: string;
}

export interface ProjectCopy {
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  body: string[];
  highlights: string[];
  tags: string[];
}

const en = {
  site: {
    title: 'Software Engineer | Rust, Linux Systems & Network Engineering',
    jobTitle: 'Software Engineer',
    bio: 'Building high-performance native systems, optimizing network traffic, and reverse-engineering hardware.',
    available: 'Available for collaboration',
  },
  lang: { label: 'Language', en: 'EN', fa: 'FA' },
  theme: { toggle: 'Toggle theme', light: 'Light', dark: 'Dark' },
  nav: {
    label: 'Primary',
    home: 'Home',
    about: 'About',
    projects: 'Projects',
    journal: 'Journal',
    contact: 'Contact',
  },
  a11y: { skip: 'Skip to content' },
  hero: {
    prompt: 'whoami',
    role: 'Systems & Network Engineer',
    bio: 'I design native software in Rust, move packets faster than they should go, and take hardware apart to make it do what the vendor never documented.',
    ctaProjects: 'View projects',
    ctaGitHub: 'GitHub',
    stackLabel: 'Working with',
    stack: ['Rust', 'Linux', 'Networking', 'TypeScript', 'AI', 'Open Source'],
  },
  home: {
    featured: 'Featured projects',
    featuredCommand: 'ls ./featured-projects/',
    viewAll: 'View all projects',
  },
  projects: {
    title: 'Projects',
    command: 'ls ./projects/',
    intro:
      'Native systems, network tooling and hardware work. Each one started with a limitation someone said was permanent.',
    back: 'cd ../projects',
    whatItDoes: 'What it does',
    featured: 'Featured',
    /** Home-page bento grid, shown when a vault project asks for it in frontmatter. */
    items: [
      {
        slug: 'vegord',
        name: 'Vegord / Vegorde',
        tagline: 'Native network optimization system',
        summary:
          'A Rust-based architecture that replaces Electron overhead with TLS fragmentation, DoH and ISP-aware smart routing.',
        body: [
          'Vegord is a native, performance-focused networking tool written in Rust. It targets the overhead of Electron-style clients by moving the hot path into a native binary while keeping advanced traffic-engineering features.',
          'It implements TLS fragmentation, DNS-over-HTTPS and ISP-aware smart routing so restricted connections stay reachable with minimal added latency, and ships remote fragmentation presets that are selected automatically for the current network.',
        ],
        highlights: [
          'Rust-based networking core with TLS fragmentation and DoH.',
          'ISP-aware and latency-aware smart IP routing.',
          'Remote fragmentation presets with automatic selection.',
          'Native architecture replacing Electron to cut memory and CPU overhead.',
        ],
        tags: ['Rust', 'TLS Fragmentation', 'DoH', 'Smart Routing'],
      },
      {
        slug: 'bidandoonvpn',
        name: 'BidandoonVPN',
        tagline: 'Cross-platform VPN client & infrastructure',
        summary:
          'Flutter & Dart VPN client with custom UI/UX, subscription management and 3x-ui backend integration.',
        body: [
          'BidandoonVPN is an end-to-end VPN product: a Flutter client for Android and Linux, plus the backend infrastructure that keeps it running.',
          'The client integrates Xray with VLESS and gRPC over TLS, manages subscriptions, and applies server-side presets. Packaging and distribution are handled natively for Linux, alongside a Telegram Mini App interface.',
        ],
        highlights: [
          'Flutter / Dart client with custom UI/UX for Android and Linux.',
          'Xray, VLESS, gRPC and TLS transport with subscription management.',
          '3x-ui backend integration and REST API automation.',
          'Linux packaging plus a Telegram Mini App surface.',
        ],
        tags: ['Flutter', 'Dart', 'Xray', 'VLESS', 'gRPC'],
      },
      {
        slug: 'intel-arc-rgb',
        name: 'Intel Arc B580 RGB',
        tagline: 'Hardware reverse engineering',
        summary:
          'Reverse-engineered the I²C RGB controller on an ASRock Intel Arc B580 to enable open-source RGB control via OpenRGB.',
        body: [
          'A deep-dive hardware investigation into the ASRock Steel Legend Intel Arc B580, which shipped with no open-source RGB support.',
          'The work traced the I²C / SMBus path, probed PCI device registers and analysed the Nuvoton MCU firmware to reconstruct the proprietary control protocol, then fed the findings back into OpenRGB.',
        ],
        highlights: [
          'I²C / SMBus bus analysis and controller address discovery.',
          'PCI device and GPU register probing.',
          'Nuvoton MCU firmware investigation (APROM / LDROM).',
          'Packet construction verified on real hardware, upstreamed to OpenRGB.',
        ],
        tags: ['Reverse Engineering', 'I²C', 'SMBus', 'OpenRGB'],
      },
      {
        slug: 'arman-music',
        name: 'Arman Music',
        tagline: 'AI-powered music discovery',
        summary:
          'AI music platform and CLI that integrate local LLMs for natural-language playlist generation and multi-source aggregation.',
        body: [
          'Arman Music is a Spotify-inspired music platform with an AI assistant at its core, plus a companion CLI for power users.',
          'It runs local LLMs for natural-language playlist generation and search across multiple music sources, and imports local libraries and M3U8 playlists to keep everything in one place.',
        ],
        highlights: [
          'Local LLM integration for natural-language playlist creation.',
          'Multi-source music aggregation and metadata extraction.',
          'Spotify-inspired listening experience with curated discovery.',
          'CLI tooling for fast, scriptable access.',
        ],
        tags: ['AI', 'LLM', 'RAG', 'Rust CLI'],
      },
    ] as ProjectCopy[],
  },
  about: {
    title: 'About',
    command: 'cat ~/about.md',
    intro:
      'I work on the layers most people skip: native binaries, network protocols and the hardware underneath the abstraction. Here is the short version of how I got here.',
    timelineTitle: 'Terminal history',
    timeline: [
      {
        period: 'Early days',
        title: 'First lines of code',
        body: 'Started with scripting and small utilities, learning how software really works by breaking it apart and rebuilding it.',
      },
      {
        period: 'Systems programming',
        title: 'Down to the metal',
        body: 'Moved into C and Linux internals — processes, memory, the kernel, and everything sitting below the abstraction line.',
      },
      {
        period: 'Rust & performance',
        title: 'Native by default',
        body: 'Adopted Rust for network and systems work, replacing heavy runtimes with fast, memory-safe native binaries.',
      },
      {
        period: 'Network engineering',
        title: 'Traffic, protocols, packets',
        body: 'Deep work on Xray, VLESS, TLS fragmentation and smart routing — with device-level reverse engineering on the side.',
      },
    ] as TimelineEntry[],
    stackTitle: 'Tech stack',
    stack: [
      { group: 'Languages', items: ['Rust', 'C', 'TypeScript', 'Dart', 'Python', 'Bash'] },
      {
        group: 'Systems',
        items: ['Linux', 'Kernel internals', 'I²C / SMBus', 'Ethernet', 'Reverse Engineering'],
      },
      {
        group: 'Networking',
        items: ['Xray', 'VLESS', 'gRPC', 'TLS Fragmentation', 'DoH', 'Smart Routing'],
      },
      { group: 'Apps & AI', items: ['Flutter', 'Astro', 'Tailwind CSS', 'Local LLMs', 'RAG'] },
      { group: 'Tooling', items: ['Git', 'OpenRGB', '3x-ui', 'Telegram Mini Apps'] },
    ] as TechGroup[],
    currentlyTitle: 'Currently',
    currently: [
      'Building Vegord, a native Rust networking system.',
      'Maintaining BidandoonVPN across client and backend.',
      'Documenting hardware reverse-engineering work in the open.',
    ] as string[],
  },
  contact: {
    title: 'Contact',
    command: 'ls ./contact-methods/',
    intro: 'No forms, no queues. Pick a channel and open a direct line.',
    hint: 'Direct channel',
    availabilityNote: 'Usually replying within a day. English and Persian both work.',
    methods: [
      {
        id: 'email',
        label: 'Email',
        handle: 'hi@arman-hosseini.ir',
        command: '> connect --method email',
        note: 'Best for work and collaboration',
        icon: 'mail',
        href: 'mailto:hi@arman-hosseini.ir',
      },
      {
        id: 'telegram',
        label: 'Telegram',
        handle: '@the_vergoboy',
        command: '> connect --method telegram',
        note: 'Fastest response',
        icon: 'telegram',
        href: 'https://t.me/the_vergoboy',
      },
      {
        id: 'discord',
        label: 'Discord',
        handle: '@the_vergoboy',
        command: '> connect --method discord',
        note: 'Handle only — send a friend request',
        icon: 'discord',
      },
      {
        id: 'linkedin',
        label: 'LinkedIn',
        handle: 'in/arman-hosseini',
        command: '> connect --method linkedin',
        note: 'Professional network',
        icon: 'linkedin',
        href: 'https://www.linkedin.com/in/arman-hosseini-022471334',
      },
      {
        id: 'github',
        label: 'GitHub',
        handle: '@vergoboy',
        command: '> connect --method github',
        note: 'Primary archive — code & releases',
        icon: 'github',
        href: 'https://github.com/vergoboy',
      },
      {
        id: 'codeberg',
        label: 'Codeberg',
        handle: '@vergoboy',
        command: '> connect --method codeberg',
        note: 'Active development',
        icon: 'codeberg',
        href: 'https://codeberg.org/vergoboy',
      },
      {
        id: 'mastodon',
        label: 'Mastodon',
        handle: '@the_vergoboy',
        command: '> connect --method mastodon',
        note: 'Occasional posts',
        icon: 'mastodon',
        href: 'https://mastodon.social/@the_vergoboy',
      },
    ] as ContactMethod[],
  },
  journal: {
    title: 'Journal',
    command: 'ls ./journal/',
    intro:
      'Working notes: things I built, broke, measured and had to learn properly the second time.',
    back: 'cd ../journal',
    empty: 'No entries yet. Notes published from the Obsidian vault will appear here.',
    emptyHint: 'Run npm run sync:content after publishing a note.',
    published: 'Published',
    updated: 'Updated',
    readingTime: 'min read',
  },
  footer: {
    command: 'contact --list',
    builtWith: 'Built with Astro & Tailwind',
    backToTop: 'Back to top',
  },
  meta: {
    home: {
      title: 'Arman Hosseini | Software Engineer — Rust, Linux Systems & Networks',
      description:
        'Arman Hosseini is a software engineer building high-performance native systems in Rust, optimizing network traffic, and reverse-engineering hardware.',
    },
    about: {
      title: 'About Arman Hosseini — Rust, Systems Programming & Networks',
      description:
        'The path from first lines of code to systems programming in C and Rust, and deep network engineering with Xray, VLESS and traffic optimization.',
    },
    projects: {
      title: 'Projects | Arman Hosseini',
      description:
        'Selected work by Arman Hosseini: Rust networking, VPN infrastructure, hardware reverse engineering and AI music tooling.',
    },
    journal: {
      title: 'Journal | Arman Hosseini',
      description:
        'Working notes by Arman Hosseini on Rust, Linux systems, networking and hardware reverse engineering.',
    },
    contact: {
      title: 'Contact Arman Hosseini',
      description:
        'Direct channels to reach Arman Hosseini: email, Telegram, Discord, LinkedIn, GitHub, Codeberg and Mastodon.',
    },
  },
};

const fa: typeof en = {
  site: {
    title: 'مهندس نرمافزار | Rust، سیستمعامل لینوکس و مهندسی شبکه',
    jobTitle: 'مهندس نرمافزار',
    bio: 'ساخت سیستمهای بومی پرسرعت، بهینهسازی ترافیک شبکه و مهندسی معکوس سختافزار.',
    available: 'آماده همکاری',
  },
  lang: { label: 'زبان', en: 'EN', fa: 'FA' },
  theme: { toggle: 'تغییر پوسته', light: 'روشن', dark: 'تیره' },
  nav: {
    label: 'اصلی',
    home: 'خانه',
    about: 'درباره',
    projects: 'پروژهها',
    journal: 'یادداشتها',
    contact: 'تماس',
  },
  a11y: { skip: 'پرش به محتوا' },
  hero: {
    prompt: 'whoami',
    role: 'مهندس سیستم و شبکه',
    bio: 'نرمافزار بومی با Rust میسازم، بستهها را سریعتر از حد معمول جابهجا میکنم و سختافزار را باز میکنم تا کاری کند که سازنده هرگز مستند نکرده است.',
    ctaProjects: 'مشاهده پروژهها',
    ctaGitHub: 'گیتهاب',
    stackLabel: 'در حال کار با',
    stack: ['Rust', 'لینوکس', 'شبکه', 'TypeScript', 'هوش مصنوعی', 'متنباز'],
  },
  home: {
    featured: 'پروژههای منتخب',
    featuredCommand: 'ls ./featured-projects/',
    viewAll: 'مشاهده همه پروژهها',
  },
  projects: {
    title: 'پروژهها',
    command: 'ls ./projects/',
    intro:
      'سیستمهای بومی، ابزارهای شبکه و کار روی سختافزار. هرکدام با محدودیتی شروع شد که میگفتند دائمی است.',
    back: 'cd ../projects',
    whatItDoes: 'این پروژه چه میکند؟',
    featured: 'منتخب',
    items: [
      {
        slug: 'vegord',
        name: 'Vegord / Vegorde',
        tagline: 'سیستم بومی بهینهسازی شبکه',
        summary:
          'معماری مبتنی بر Rust که سرباز Electron را با تکهتکهسازی TLS، DoH و مسیریابی هوشمند آگاه از ISP جایگزین میکند.',
        body: [
          'Vegord یک ابزار شبکهسازی بومی و متمرکز بر کارایی است که با Rust نوشته شده است. هدفش کاهش سرباز کلاینتهای مبتنی بر Electron است: مسیر داغ پردازش به یک باینری بومی منتقل میشود و در همان حال قابلیتهای پیشرفته مهندسی ترافیک حفظ میشوند.',
          'این پروژه تکهتکهسازی TLS، DNS روی HTTPS و مسیریابی هوشمند آگاه از ISP را پیادهسازی میکند تا اتصالهای محدودشده با کمترین تأخیر در دسترس بمانند؛ پیکربندیهای از راه دور تکهتکهسازی نیز بهصورت خودکار برای شبکه جاری انتخاب میشوند.',
        ],
        highlights: [
          'هسته شبکهسازی مبتنی بر Rust با تکهتکهسازی TLS و DoH.',
          'مسیریابی هوشمند IP آگاه از ISP و تأخیر.',
          'پیکربندیهای از راه دور تکهتکهسازی با انتخاب خودکار.',
          'معماری بومی بهجای Electron برای کاهش مصرف حافظه و پردازنده.',
        ],
        tags: ['Rust', 'تکهتکهسازی TLS', 'DoH', 'مسیریابی هوشمند'],
      },
      {
        slug: 'bidandoonvpn',
        name: 'BidandoonVPN',
        tagline: 'کلاینت و زیرساخت VPN چندسکویی',
        summary:
          'کلاینت VPN مبتنی بر Flutter و Dart با رابط کاربری اختصاصی، مدیریت اشتراک و یکپارچگی با بکاند 3x-ui.',
        body: [
          'BidandoonVPN یک محصول VPN سرتاسری است: کلاینتی با Flutter برای اندروید و لینوکس، بههمراه زیرساخت بکاندی که آن را پایدار نگه میدارد.',
          'این کلاینت Xray را با VLESS و gRPC روی TLS یکپارچه میکند، اشتراکها را مدیریت میکند و پیکربندیهای سمت سرور را اعمال میکند. بستهبندی و توزیع برای لینوکس بهصورت بومی انجام میشود و یک مینیاپ تلگرام نیز در دسترس است.',
        ],
        highlights: [
          'کلاینت Flutter / Dart با رابط کاربری اختصاصی برای اندروید و لینوکس.',
          'حملونقل Xray، VLESS، gRPC و TLS همراه با مدیریت اشتراک.',
          'یکپارچگی با بکاند 3x-ui و خودکارسازی REST API.',
          'بستهبندی لینوکس بههمراه یک سطح مینیاپ تلگرام.',
        ],
        tags: ['Flutter', 'Dart', 'Xray', 'VLESS', 'gRPC'],
      },
      {
        slug: 'intel-arc-rgb',
        name: 'RGB اینتل Arc B580',
        tagline: 'مهندسی معکوس سختافزار',
        summary:
          'مهندسی معکوس کنترلر RGB مبتنی بر I²C روی کارت ASRock Intel Arc B580 برای فعالکردن کنترل متنباز RGB از طریق OpenRGB.',
        body: [
          'یک بررسی عمیق سختافزاری روی ASRock Steel Legend Intel Arc B580 که بدون هیچ پشتیبانی متنباز RGB عرضه شده بود.',
          'در این کار مسیر I²C / SMBus ردیابی شد، رجیسترهای دستگاه PCI بررسی شدند و فریمور میکروکنترلر Nuvoton تحلیل شد تا پروتکل اختصاصی کنترل بازسازی شود؛ نتیجه در نهایت به OpenRGB بازگردانده شد.',
        ],
        highlights: [
          'تحلیل گذرگاه I²C / SMBus و کشف آدرس کنترلر.',
          'بررسی رجیسترهای دستگاه PCI و GPU.',
          'تحلیل فریمور میکروکنترلر Nuvoton (APROM / LDROM).',
          'ساخت بسته تأییدشده روی سختافزار واقعی و ارسال به OpenRGB.',
        ],
        tags: ['مهندسی معکوس', 'I²C', 'SMBus', 'OpenRGB'],
      },
      {
        slug: 'arman-music',
        name: 'Arman Music',
        tagline: 'کشف موسیقی با هوش مصنوعی',
        summary:
          'پلتفرم و ابزار خط فرمان موسیقی با هوش مصنوعی که مدلهای زبانی محلی را برای ساخت فهرست پخش با زبان طبیعی و تجمیع چندمنبعی به کار میگیرد.',
        body: [
          'Arman Music یک پلتفرم موسیقی الهامگرفته از Spotify است که دستیار هوش مصنوعی در قلب آن قرار دارد، بههمراه یک ابزار خط فرمان برای کاربران حرفهای.',
          'این پروژه مدلهای زبانی محلی را برای ساخت فهرست پخش با زبان طبیعی و جستوجو در چند منبع موسیقی اجرا میکند و کتابخانههای محلی و فهرستهای M3U8 را وارد میکند تا همهچیز در یک جا جمع شود.',
        ],
        highlights: [
          'یکپارچگی با مدل زبانی محلی برای ساخت فهرست پخش با زبان طبیعی.',
          'تجمیع چندمنبعی موسیقی و استخراج فراداده.',
          'تجربه شنیداری الهامگرفته از Spotify با کشف هدفمند.',
          'ابزار خط فرمان برای دسترسی سریع و قابل اسکریپتنویسی.',
        ],
        tags: ['هوش مصنوعی', 'مدل زبانی', 'RAG', 'خط فرمان Rust'],
      },
    ],
  },
  about: {
    title: 'درباره',
    command: 'cat ~/about.md',
    intro:
      'روی لایههایی کار میکنم که بیشتر افراد از آنها عبور میکنند: باینریهای بومی، پروتکلهای شبکه و سختافزاری که زیر لایه انتزاع قرار دارد. این روایت کوتاه مسیر من است.',
    timelineTitle: 'تاریخچه ترمینال',
    timeline: [
      {
        period: 'روزهای اول',
        title: 'اولین خطوط کد',
        body: 'با اسکریپتنویسی و ابزارهای کوچک شروع کردم؛ نرمافزار را با بازکردن و از نو ساختنش یاد گرفتم.',
      },
      {
        period: 'برنامهنویسی سیستمی',
        title: 'تا نزدیک سختافزار',
        body: 'به C و درونیات لینوکس رفتم — فرایندها، حافظه، کرنل و هر چیزی که زیر لایه انتزاع قرار دارد.',
      },
      {
        period: 'Rust و کارایی',
        title: 'بومی بهصورت پیشفرض',
        body: 'Rust را برای کارهای شبکه و سیستمی انتخاب کردم؛ محیطهای اجرایی سنگین جای خود را به باینریهای بومی، سریع و امن دادند.',
      },
      {
        period: 'مهندسی شبکه',
        title: 'ترافیک، پروتکلها، بستهها',
        body: 'کار عمیق روی Xray، VLESS، تکهتکهسازی TLS و مسیریابی هوشمند، بههمراه مهندسی معکوس سختافزار.',
      },
    ],
    stackTitle: 'پشته فناوری',
    stack: [
      { group: 'زبانها', items: ['Rust', 'C', 'TypeScript', 'Dart', 'Python', 'Bash'] },
      {
        group: 'سیستم و سختافزار',
        items: ['لینوکس', 'درونیات کرنل', 'I²C / SMBus', 'اترنت', 'مهندسی معکوس'],
      },
      {
        group: 'شبکه',
        items: ['Xray', 'VLESS', 'gRPC', 'تکهتکهسازی TLS', 'DoH', 'مسیریابی هوشمند'],
      },
      {
        group: 'برنامه و هوش مصنوعی',
        items: ['Flutter', 'Astro', 'Tailwind CSS', 'مدلهای زبانی محلی', 'RAG'],
      },
      { group: 'ابزارها', items: ['Git', 'OpenRGB', '3x-ui', 'مینیاپ تلگرام'] },
    ],
    currentlyTitle: 'در حال حاضر',
    currently: [
      'در حال ساخت Vegord، یک سیستم شبکهسازی بومی با Rust.',
      'پشتیبانی و توسعه BidandoonVPN در کلاینت و بکاند.',
      'مستندسازی متنباز پروژههای مهندسی معکوس سختافزار.',
    ],
  },
  contact: {
    title: 'تماس',
    command: 'ls ./contact-methods/',
    intro: 'بدون فرم و بدون صف. یک کانال را انتخاب کنید و مستقیم گفتوگو را شروع کنید.',
    hint: 'کانال مستقیم',
    availabilityNote: 'معمولاً کمتر از یک روز پاسخ میدهم. فارسی و انگلیسی هر دو خوب است.',
    methods: [
      {
        id: 'email',
        label: 'ایمیل',
        handle: 'hi@arman-hosseini.ir',
        command: '> connect --method email',
        note: 'بهترین گزینه برای همکاری و کار',
        icon: 'mail',
        href: 'mailto:hi@arman-hosseini.ir',
      },
      {
        id: 'telegram',
        label: 'تلگرام',
        handle: '@the_vergoboy',
        command: '> connect --method telegram',
        note: 'سریعترین راه ارتباطی',
        icon: 'telegram',
        href: 'https://t.me/the_vergoboy',
      },
      {
        id: 'discord',
        label: 'دیسکورد',
        handle: '@the_vergoboy',
        command: '> connect --method discord',
        note: 'فقط نام کاربری — درخواست دوستی بفرستید',
        icon: 'discord',
      },
      {
        id: 'linkedin',
        label: 'لینکدین',
        handle: 'in/arman-hosseini',
        command: '> connect --method linkedin',
        note: 'شبکه حرفهای',
        icon: 'linkedin',
        href: 'https://www.linkedin.com/in/arman-hosseini-022471334',
      },
      {
        id: 'github',
        label: 'گیتهاب',
        handle: '@vergoboy',
        command: '> connect --method github',
        note: 'آرشیو اصلی — کد و نسخهها',
        icon: 'github',
        href: 'https://github.com/vergoboy',
      },
      {
        id: 'codeberg',
        label: 'Codeberg',
        handle: '@vergoboy',
        command: '> connect --method codeberg',
        note: 'توسعه فعال',
        icon: 'codeberg',
        href: 'https://codeberg.org/vergoboy',
      },
      {
        id: 'mastodon',
        label: 'Mastodon',
        handle: '@the_vergoboy',
        command: '> connect --method mastodon',
        note: 'یادداشتهای پراکنده',
        icon: 'mastodon',
        href: 'https://mastodon.social/@the_vergoboy',
      },
    ],
  },
  journal: {
    title: 'یادداشتها',
    command: 'ls ./journal/',
    intro: 'یادداشتهای کار: چیزهایی که ساختم، شکستم، اندازه گرفتم و بار دوم درست یاد گرفتم.',
    back: 'cd ../journal',
    empty: 'هنوز یادداشتی منتشر نشده است. یادداشتهایی که از وانِت Obsidian منتشر شوند، اینجا نمایش داده میشوند.',
    emptyHint: 'پس از انتشار یادداشت، دستور npm run sync:content را اجرا کنید.',
    published: 'انتشار',
    updated: 'بهروزرسانی',
    readingTime: 'دقیقه مطالعه',
  },
  footer: {
    command: 'contact --list',
    builtWith: 'ساختهشده با Astro و Tailwind',
    backToTop: 'بازگشت به بالا',
  },
  meta: {
    home: {
      title: 'آرمین حسینی | مهندس نرمافزار — Rust، لینوکس و شبکه',
      description:
        'آرمین حسینی، مهندس نرمافزار؛ ساخت سیستمهای بومی پرسرعت با Rust، بهینهسازی ترافیک شبکه و مهندسی معکوس سختافزار.',
    },
    about: {
      title: 'درباره آرمین حسینی — برنامهنویسی سیستمی و شبکه',
      description:
        'مسیر آرمین حسینی از اولین خطوط کد تا برنامهنویسی سیستمی با C و Rust و مهندسی شبکه با Xray، VLESS و بهینهسازی ترافیک.',
    },
    projects: {
      title: 'پروژهها | آرمین حسینی',
      description:
        'نمونهکارهای منتخب آرمین حسینی: شبکهسازی با Rust، زیرساخت VPN، مهندسی معکوس سختافزار و ابزارهای موسیقی مبتنی بر هوش مصنوعی.',
    },
    journal: {
      title: 'یادداشتها | آرمین حسینی',
      description:
        'یادداشتهای کاری آرمین حسینی درباره Rust، سیستمعامل لینوکس، شبکه و مهندسی معکوس سختافزار.',
    },
    contact: {
      title: 'تماس با آرمین حسینی',
      description:
        'راههای ارتباطی مستقیم با آرمین حسینی: ایمیل، تلگرام، دیسکورد، لینکدین، گیتهاب، Codeberg و Mastodon.',
    },
  },
};

const dictionaries = { en, fa } as const;

export type Dictionary = (typeof dictionaries)['en'];

/** Full dictionary for a language — use for arrays and rich content. */
export function useTranslations(lang: Lang): Dictionary {
  return dictionaries[lang] ?? dictionaries[defaultLang];
}

/** Resolve a dotted key (e.g. `nav.about`) to a string, falling back to English. */
export function t(key: string, lang: Lang): string {
  const resolve = (source: unknown): unknown =>
    key.split('.').reduce<unknown>((acc, part) => {
      if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part];
      return undefined;
    }, source);

  const value = resolve(dictionaries[lang]) ?? resolve(dictionaries[defaultLang]);
  return typeof value === 'string' ? value : key;
}

/** `/about` + `fa` -> `/fa/about/`; `/` + `fa` -> `/fa/`. */
export function localizedPath(lang: Lang, path = '/'): string {
  const clean = path.replace(/^\/+/, '').replace(/\/+$/, '');
  return clean ? `/${lang}/${clean}/` : `/${lang}/`;
}

/** Normalise a pathname to a single trailing slash (matches Astro's directory output). */
export function normalizePath(pathname: string): string {
  const path = pathname.split('?')[0].split('#')[0];
  if (!path || path === '/') return '/';
  return `${path.replace(/\/+$/, '')}/`;
}

/** Read the language segment off a pathname; unknown paths fall back to English. */
export function getLangFromPath(pathname: string): Lang {
  const match = /^\/(en|fa)(?=\/|$)/.exec(pathname);
  return (match?.[1] as Lang) ?? defaultLang;
}

/** Same page in the other language — used by the language switcher and hreflang. */
export function switchLangPath(pathname: string, target: Lang): string {
  const path = normalizePath(pathname);
  const rest = path.replace(/^\/(en|fa)(?=\/|$)/, '');
  return localizedPath(target, rest || '/');
}

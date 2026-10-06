export interface SocialLink {
  label: string;
  href: string;
  icon: string;
}

export const socials: SocialLink[] = [
  { label: "GitHub", href: "https://github.com/vergoboy", icon: "github" },
  {
    label: "Codeberg",
    href: "https://codeberg.org/vergoboy",
    icon: "codeberg",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/arman-hosseini-022471334",
    icon: "linkedin",
  },
  {
    label: "Mastodon",
    href: "https://mastodon.social/@the_vergoboy",
    icon: "mastodon",
  },
  { label: "Telegram", href: "https://t.me/the_vergoboy", icon: "telegram" },
  { label: "Discord", href: "#", icon: "discord" },
  { label: "Email", href: "mailto:hi@arman-hosseini.ir", icon: "mail" },
];

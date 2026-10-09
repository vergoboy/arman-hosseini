/** Components every MDX page can use without importing (imports of "@/components/…" are stripped). */
import Callout from '../components/Callout.astro';
import Card from '../components/Card.astro';
import Tabs from '../components/Tabs.astro';
import Tab from '../components/Tab.astro';
import YouTube from '../components/YouTube.astro';
import AudioPlayer from '../components/AudioPlayer.astro';
import VideoPlayer from '../components/VideoPlayer.astro';

export const mdxComponents = { Callout, Card, Tabs, Tab, YouTube, AudioPlayer, VideoPlayer };

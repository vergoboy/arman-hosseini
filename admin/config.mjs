import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const env = process.env;

export const SITE_DIR = path.resolve(env.SITE_DIR || path.join(here, '..'));
export const DATA_DIR = path.resolve(env.DATA_DIR || path.join(SITE_DIR, '.admin-data'));
export const RELEASES_DIR = path.resolve(env.RELEASES_DIR || path.join(SITE_DIR, 'releases'));
/** nginx `root` points at this symlink; builds flip it atomically. */
export const CURRENT_LINK = path.resolve(env.CURRENT_LINK || path.join(SITE_DIR, 'current'));
export const CONTENT_DIR = path.join(SITE_DIR, 'src', 'content');
export const OVERRIDES_FILE = path.join(SITE_DIR, 'content-meta', 'overrides.json');
export const MEDIA_DIR = path.join(SITE_DIR, 'public', 'media');
export const PUBLIC_DIR = path.join(here, 'public');

export const HOST = env.ADMIN_HOST || '127.0.0.1';
export const PORT = Number(env.ADMIN_PORT || 4322);
export const BUILD_CMD = env.BUILD_CMD || 'npm run build:site';
export const KEEP_RELEASES = Number(env.KEEP_RELEASES || 5);
export const SITE_URL = env.SITE_URL || 'https://arman-hosseini.ir';
export const COLLECTIONS = ['projects', 'journal'];
export const LANGS = ['en', 'fa'];
export const SCHEMA_TYPES = ['auto', 'Article', 'BlogPosting', 'TechArticle', 'HowTo', 'FAQPage', 'SoftwareApplication', 'SoftwareSourceCode', 'CreativeWork', 'WebPage'];
export const STATIC_PAGES = ['home', 'about', 'projects', 'journal', 'contact'];

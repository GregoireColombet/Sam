export type LocalizedText = {
  en: string;
  zhTW: string;
  zhCN: string;
};

export type MediaAsset = {
  id: number;
  url: string;
  alt: string;
};

export type NewsBlock = {
  title: LocalizedText;
  body: LocalizedText;
  background?: MediaAsset;
  countdownAtUtc?: string;
};

export type TourDate = {
  id: number;
  slug: string;
  dateUtc: string;
  localDate: string;
  localTime: string;
  timezone: string;
  location: LocalizedText;
  description: LocalizedText;
  ticketLinkCount: number;
};

export type AlbumCover = {
  id: number;
  title: string;
  image: MediaAsset;
};

export type VideoLink = {
  id: number;
  title: string;
  thumbnail?: MediaAsset;
  providerEn: string;
  urlEn: string;
  providerZhTw: string;
  urlZhTw: string;
  providerZhCn: string;
  urlZhCn: string;
};

export type PlatformLink = {
  id: number;
  name: string;
  url: string;
  logo: MediaAsset;
};

export type LandingContent = {
  news: NewsBlock | null;
  tours: TourDate[];
  albums: AlbumCover[];
  videos: VideoLink[];
  socialLinks: PlatformLink[];
  merchUrl: string | null;
};

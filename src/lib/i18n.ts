export const locales = ["en", "zh-TW", "zh-CN"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "zh-TW";

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}

export function localePath(locale: Locale, path = "") {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean === "/" ? "" : clean}`;
}

type Labels = {
  home: string;
  music: string;
  tour: string;
  merch: string;
  about: string;
  zoommuzikProduction: string;
  businessInquiries: string;
  purchase: string;
  passed: string;
  comingSoon: string;
  tourComingSoon: string;
  musicComingSoon: string;
  merchComingSoon: string;
  albumComingSoon: string;
  videoComingSoon: string;
  days: string;
  hours: string;
  minutes: string;
  ticketLinks: string;
  choosePlatform: string;
  backHome: string;
};

export const labels: Record<Locale, Labels> = {
  en: {
    home: "Home",
    music: "Music",
    tour: "Tour",
    merch: "Merchandising",
    about: "About",
    zoommuzikProduction: "Zoommuzik production",
    businessInquiries: "Contact for business inquiries",
    purchase: "Purchase",
    passed: "Passed",
    comingSoon: "Coming soon",
    tourComingSoon: "Tour dates coming soon",
    musicComingSoon: "Music links coming soon",
    merchComingSoon: "Merch coming soon",
    albumComingSoon: "Album covers coming soon",
    videoComingSoon: "Videos coming soon",
    days: "Days",
    hours: "Hours",
    minutes: "Minutes",
    ticketLinks: "Ticketing platforms",
    choosePlatform: "Choose a platform",
    backHome: "Back home"
  },
  "zh-TW": {
    home: "首頁",
    music: "音樂",
    tour: "巡演",
    merch: "周邊商品",
    about: "關於",
    zoommuzikProduction: "錞藝音樂製作",
    businessInquiries: "商務合作信箱",
    purchase: "購票",
    passed: "已結束",
    comingSoon: "即將公布",
    tourComingSoon: "巡演日期即將公布",
    musicComingSoon: "音樂平台連結即將公布",
    merchComingSoon: "周邊商品即將公布",
    albumComingSoon: "專輯封面即將公布",
    videoComingSoon: "影片即將公布",
    days: "天",
    hours: "小時",
    minutes: "分鐘",
    ticketLinks: "購票平台",
    choosePlatform: "選擇平台",
    backHome: "回首頁"
  },
  "zh-CN": {
    home: "首页",
    music: "音乐",
    tour: "巡演",
    merch: "周边商品",
    about: "关于",
    zoommuzikProduction: "錞艺音乐制作",
    businessInquiries: "商务合作信箱",
    purchase: "购票",
    passed: "已结束",
    comingSoon: "即将公布",
    tourComingSoon: "巡演日期即将公布",
    musicComingSoon: "音乐平台链接即将公布",
    merchComingSoon: "周边商品即将公布",
    albumComingSoon: "专辑封面即将公布",
    videoComingSoon: "影片即将公布",
    days: "天",
    hours: "小时",
    minutes: "分钟",
    ticketLinks: "购票平台",
    choosePlatform: "选择平台",
    backHome: "回首页"
  }
};

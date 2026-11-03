// Bulutga sinxronlanadigan localStorage kalitlari (server ham, brauzer ham ishlatadi)
export const SYNC_KEYS = ["hq:profile", "hq:history", "hq:words", "hq:streak"] as const;
export type SyncKey = (typeof SYNC_KEYS)[number];

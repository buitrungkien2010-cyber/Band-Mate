// Gui doan tin vao Zalo (N6, US-30): dien thoai -> bang chia se (chon Zalo); may tinh -> sao chep + mo Zalo web.
export async function shareText(text) {
  try {
    if (navigator.share && /android|iphone|ipad|ipod/i.test(navigator.userAgent)) {
      await navigator.share({ text })
      return 'shared'
    }
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancelled'
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}
export const ZALO_WEB = 'https://chat.zalo.me'

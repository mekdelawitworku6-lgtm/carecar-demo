/**
 * Demo-mode Firebase stub.
 *
 * The real app uses Firebase Cloud Messaging for push notifications. The
 * portfolio demo has no backend and no Firebase credentials, so every push
 * hook is intentionally a no-op. Nothing here calls the network and the
 * browser never shows a notification permission prompt.
 */

export const registerServiceWorker = async () => null

export const requestAndRegisterFcmToken = async () => null

export const onForegroundMessage = async () => () => {}

export const clearFcmUserRegistration = () => {}

const initFirebase = async () => ({ app: null, messaging: null })

export default initFirebase

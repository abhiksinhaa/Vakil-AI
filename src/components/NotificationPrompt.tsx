'use client';

import { useEffect, useRef, useState } from 'react';

const DRAFT_GENERATED_EVENT = 'draftee:draft-generated';
const DRAFT_COUNT_KEY = 'draftee_generated_draft_count';
const PROMPT_ELIGIBLE_KEY = 'draftee_notification_prompt_eligible';
const PROMPT_DEFERRED_UNTIL_KEY = 'draftee_notification_prompt_deferred_until';
const PROMPT_DEFER_DURATION = 7 * 24 * 60 * 60 * 1000;
const ONESIGNAL_SCRIPT_ID = 'onesignal-web-sdk-v16';

type OneSignalInstance = {
  init: (options: {
    appId: string;
    serviceWorkerPath: string;
    serviceWorkerParam: { scope: string };
    promptOptions: { slidedown: { prompts: { type: 'push'; autoPrompt: false }[] } };
  }) => Promise<void>;
  Notifications: {
    requestPermission: () => Promise<void>;
  };
};

type OneSignalWindow = Window & {
  OneSignalDeferred?: Array<(instance: OneSignalInstance) => void | Promise<void>>;
};

type PromptKind = 'notification' | 'ios-install-hint' | null;

let oneSignalInitialization: Promise<OneSignalInstance> | null = null;

function initializeOneSignal(appId: string): Promise<OneSignalInstance> {
  if (oneSignalInitialization) return oneSignalInitialization;

  oneSignalInitialization = new Promise((resolve, reject) => {
    const oneSignalWindow = window as OneSignalWindow;
    oneSignalWindow.OneSignalDeferred = oneSignalWindow.OneSignalDeferred ?? [];
    oneSignalWindow.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.init({
          appId,
          serviceWorkerPath: 'OneSignalSDKWorker.js',
          serviceWorkerParam: { scope: '/' },
          promptOptions: {
            slidedown: {
              prompts: [{ type: 'push', autoPrompt: false }],
            },
          },
        });
        resolve(OneSignal);
      } catch (error) {
        oneSignalInitialization = null;
        reject(error);
      }
    });

    let script = document.getElementById(ONESIGNAL_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = ONESIGNAL_SCRIPT_ID;
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.async = true;
      script.addEventListener('error', () => {
        oneSignalInitialization = null;
        reject(new Error('The OneSignal Web SDK failed to load.'));
      }, { once: true });
      document.head.appendChild(script);
    }
  });

  return oneSignalInitialization;
}

function isIosDevice(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in navigator && navigator.standalone === true);
}

export default function NotificationPrompt({ appId }: { appId: string }) {
  const [promptKind, setPromptKind] = useState<PromptKind>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [promptError, setPromptError] = useState('');
  const oneSignalRef = useRef<OneSignalInstance | null>(null);

  useEffect(() => {
    let isMounted = true;

    const registerWorker = async () => {
      if (!('serviceWorker' in navigator)) return;
      try {
        await navigator.serviceWorker.register('/OneSignalSDKWorker.js', { scope: '/' });
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    };

    if (appId) {
      void initializeOneSignal(appId)
        .then((OneSignal) => {
          oneSignalRef.current = OneSignal;
          if (isMounted) setSdkReady(true);
        })
        .catch((error: unknown) => {
          console.error('OneSignal initialization failed:', error);
        });
    } else {
      void registerWorker();
    }

    const handleDraftGenerated = () => {
      let generatedDraftCount = 0;
      let isPromptEligible = false;
      let deferredUntil = 0;

      try {
        generatedDraftCount = Number(window.localStorage.getItem(DRAFT_COUNT_KEY)) || 0;
        generatedDraftCount += 1;
        window.localStorage.setItem(DRAFT_COUNT_KEY, String(generatedDraftCount));
        if (generatedDraftCount <= 2) {
          window.localStorage.setItem(PROMPT_ELIGIBLE_KEY, 'true');
        }
        isPromptEligible = window.localStorage.getItem(PROMPT_ELIGIBLE_KEY) === 'true';
        deferredUntil = Number(window.localStorage.getItem(PROMPT_DEFERRED_UNTIL_KEY)) || 0;
      } catch (error) {
        console.error('Could not update notification prompt preferences:', error);
      }

      if (generatedDraftCount <= 2) isPromptEligible = true;

      if (!appId || typeof Notification === 'undefined' || Notification.permission !== 'default') {
        setPromptKind(null);
        return;
      }

      if (deferredUntil > Date.now()) {
        setPromptKind(null);
        return;
      }

      if (isIosDevice() && !isStandalone()) {
        setPromptKind('ios-install-hint');
        return;
      }

      if (isPromptEligible || deferredUntil > 0) {
        setPromptError('');
        setPromptKind('notification');
      }
    };

    window.addEventListener(DRAFT_GENERATED_EVENT, handleDraftGenerated);
    return () => {
      isMounted = false;
      window.removeEventListener(DRAFT_GENERATED_EVENT, handleDraftGenerated);
    };
  }, [appId]);

  const deferPrompt = () => {
    try {
      window.localStorage.setItem(
        PROMPT_DEFERRED_UNTIL_KEY,
        String(Date.now() + PROMPT_DEFER_DURATION),
      );
    } catch (error) {
      console.error('Could not save notification prompt dismissal:', error);
    }
    setPromptKind(null);
  };

  const requestPermission = async () => {
    const OneSignal = oneSignalRef.current;
    if (!OneSignal) return;

    setRequestingPermission(true);
    setPromptError('');
    try {
      const permissionRequest = OneSignal.Notifications.requestPermission();
      await permissionRequest;
      if (typeof Notification !== 'undefined' && Notification.permission !== 'default') {
        setPromptKind(null);
      } else {
        setPromptError('The browser did not complete the permission request. Please try again.');
      }
    } catch (error) {
      console.error('OneSignal permission request failed:', error);
      setPromptError('Notifications could not be enabled. Please try again.');
    } finally {
      setRequestingPermission(false);
    }
  };

  if (!promptKind) return null;

  return (
    <aside
      className="fixed inset-x-4 bottom-24 z-[110] mx-auto max-w-lg rounded-2xl border border-gold/40 bg-navy p-4 text-cream shadow-2xl"
      aria-label="Notification preferences"
    >
      {promptKind === 'ios-install-hint' ? (
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm leading-6">
            To get notifications on iPhone, tap Share, then Add to Home Screen.
          </p>
          <button
            type="button"
            className="shrink-0 rounded px-2 text-cream/70 hover:text-cream"
            onClick={() => setPromptKind(null)}
            aria-label="Dismiss install hint"
          >
            &times;
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm leading-6">
            Get notified about new templates and drafting updates. Turn on notifications?
          </p>
          {promptError && <p role="alert" className="mt-2 text-xs text-red-300">{promptError}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={deferPrompt}
              className="rounded-lg border border-border px-3 py-2 text-sm text-cream/80 hover:bg-white/5"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={() => void requestPermission()}
              disabled={!sdkReady || requestingPermission}
              className="rounded-lg bg-gold px-3 py-2 text-sm font-medium text-navy hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {requestingPermission ? 'Opening…' : 'Yes'}
            </button>
          </div>
        </>
      )}
    </aside>
  );
}

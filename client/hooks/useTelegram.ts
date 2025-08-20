import { useEffect, useState } from 'react';
import { TelegramUser } from '../types/telegram';

export const useTelegram = () => {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [webApp, setWebApp] = useState<any>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [colorScheme, setColorScheme] = useState({
    bg_color: '#000000',
    text_color: '#ffffff',
    hint_color: '#708499',
    link_color: '#6ab7ff',
    button_color: '#5288c1',
    button_text_color: '#ffffff',
    secondary_bg_color: '#17212b'
  });

  useEffect(() => {
    // Initialize Telegram WebApp
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      setWebApp(tg);

      // Ready the WebApp
      tg.ready();
      tg.expand();

      // Set theme based on Telegram
      // colorScheme is optional in WebApp, guard with any
      const tgAny: any = tg as any;
      if (tgAny.colorScheme) {
        setTheme(tgAny.colorScheme);
      }

      // Get theme colors from Telegram
      if (tgAny.themeParams) {
        setColorScheme({
          bg_color: tgAny.themeParams.bg_color || '#000000',
          text_color: tgAny.themeParams.text_color || '#ffffff',
          hint_color: tgAny.themeParams.hint_color || '#708499',
          link_color: tgAny.themeParams.link_color || '#6ab7ff',
          button_color: tgAny.themeParams.button_color || '#5288c1',
          button_text_color: tgAny.themeParams.button_text_color || '#ffffff',
          secondary_bg_color: tgAny.themeParams.secondary_bg_color || '#17212b'
        });
      }

      // Apply theme to document
      applyTheme(theme);

      // Listen for theme changes
      if (typeof tgAny.onEvent === 'function') {
        tgAny.onEvent('themeChanged', () => {
          if (tgAny.colorScheme) {
            setTheme(tgAny.colorScheme);
            applyTheme(tgAny.colorScheme);
          }
        });
      }

      // Get user data
      if (tg.initDataUnsafe.user) {
        setUser(tg.initDataUnsafe.user);
      } else {
        // For development/testing purposes, create a mock user
        setUser({
          id: 12345,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser',
          language_code: 'en'
        });
      }
      setIsLoading(false);
    } else {
      // For development/testing when not in Telegram
      // Default to dark theme for casino aesthetic
      setTheme('dark');
      applyTheme('dark');

      setTimeout(() => {
        setUser({
          id: 12345,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser',
          language_code: 'en'
        });
        setIsLoading(false);
      }, 500);
    }
  }, []);

  const applyTheme = (currentTheme: 'light' | 'dark') => {
    const html = document.documentElement;
    if (currentTheme === 'dark') {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.add('light');
      html.classList.remove('dark');
    }
  };

  const hapticFeedback = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
    if (webApp?.HapticFeedback) {
      switch (type) {
        case 'success':
          webApp.HapticFeedback.notificationOccurred('success');
          break;
        case 'warning':
          webApp.HapticFeedback.notificationOccurred('warning');
          break;
        case 'error':
          webApp.HapticFeedback.notificationOccurred('error');
          break;
        default:
          webApp.HapticFeedback.impactOccurred(type);
      }
    }
  };

  return {
    user,
    webApp,
    isLoading,
    theme,
    colorScheme,
    hapticFeedback,
    userId: user?.id,
    username: user?.username,
    fullName: user ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}` : null
  };
};

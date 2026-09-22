import type { ConfigContext, ExpoConfig } from 'expo/config'
import type { ConfigPlugin } from 'expo/config-plugins'
import { withAndroidManifest } from 'expo/config-plugins'
import { version } from './package.json'

export default ({ config }: ConfigContext): ExpoConfig => {
  const { name, scheme, slug } = getConfig()

  return {
    ...config,
    name,
    version,
    slug,
    owner: 'tech.jbportals.team',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme,
    userInterfaceStyle: 'automatic',
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: scheme,
    },
    updates: {
      url: 'https://u.expo.dev/055c4f68-c31e-41fe-bca2-8f4a15b5af71',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: scheme,
      runtimeVersion: 'appVersion',
      blockedPermissions: [
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.READ_MEDIA_VIDEO',
      ],
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    extra: {
      eas: {
        projectId: '055c4f68-c31e-41fe-bca2-8f4a15b5af71',
      },
    },
    plugins: [
      'expo-font',
      'expo-router',
      'expo-web-browser',
      'expo-secure-store',
      'expo-localization',
      '@react-native-community/datetimepicker',
      'expo-image',
      'expo-status-bar',
      [
        'expo-screen-orientation',
        {
          initialOrientation: 'DEFAULT',
        },
      ],
      ['expo-video'],
      [
        '@mux/mux-react-native-player/plugin',
        {
          enablePictureInPicture: true,
          enableBackgroundAudio: false,
        },
      ],
      [
        'expo-splash-screen',
        {
          backgroundColor: '#FFFFFF',
          image: './assets/images/splash-icon.png',
          dark: {
            image: './assets/images/splash-icon-dark.png',
            backgroundColor: '#000000',
          },
          imageWidth: 200,
        },
      ],
    ],
    experiments: {
      tsconfigPaths: true,
      typedRoutes: true,
    },
  }
}

export function getConfig() {
  switch (process.env.APP_ENV) {
    case 'development':
      return {
        name: 'Instello (Dev)',
        scheme: 'in.instello.dev',
        slug: 'instello',
      }
    case 'preview':
      return {
        name: 'Instello (Preview)',
        scheme: 'in.instello.preview',
        slug: 'instello-preview',
      }
    case 'production':
      return {
        name: 'Instello',
        scheme: 'in.instello.app',
        slug: 'instello',
      }
    default:
      return {
        name: 'Instello',
        scheme: 'in.instello.app',
        slug: 'instello',
      }
  }
}

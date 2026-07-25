import { Directory, File, Paths } from 'expo-file-system'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, useColorScheme, View } from 'react-native'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'
import { Text } from '@/components/ui/text'
import { THEME } from '@/lib/theme'

function getPdfUrl(fileId: string) {
  const projectId = process.env.EXPO_PUBLIC_UPLOADTHING_PROJECT_ID
  if (!projectId) return null
  return `https://${projectId}.ufs.sh/f/${fileId}`
}

function buildPdfHtml(base64: string, isDark: boolean) {
  const background = isDark ? '#0a0a0a' : '#ffffff'
  const foreground = isDark ? '#fafafa' : '#0a0a0a'

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=3, user-scalable=yes"
    />
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        background: ${background};
        color: ${foreground};
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      }
      #status {
        padding: 24px 16px;
        text-align: center;
        font-size: 14px;
      }
      #viewer {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 12px 8px 32px;
      }
      canvas {
        width: 100% !important;
        height: auto !important;
        max-width: 100%;
        box-shadow: 0 1px 4px rgba(0,0,0,0.18);
        background: #fff;
      }
    </style>
  </head>
  <body>
    <div id="status">Rendering PDF…</div>
    <div id="viewer"></div>
    <script>
      (function () {
        var statusEl = document.getElementById('status');
        var viewerEl = document.getElementById('viewer');
        var base64 = ${JSON.stringify(base64)};

        function post(type, message) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, message: message || '' }));
          }
        }

        function base64ToUint8Array(b64) {
          var binary = atob(b64);
          var len = binary.length;
          var bytes = new Uint8Array(len);
          for (var i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          return bytes;
        }

        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

          pdfjsLib.getDocument({ data: base64ToUint8Array(base64) }).promise
            .then(function (pdf) {
              statusEl.style.display = 'none';
              post('ready');

              var width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
              var scale = width > 0 ? (width / 612) * 1.5 : 1.5;

              var renderPage = function (pageNum) {
                return pdf.getPage(pageNum).then(function (page) {
                  var viewport = page.getViewport({ scale: scale });
                  var canvas = document.createElement('canvas');
                  var context = canvas.getContext('2d');
                  canvas.height = viewport.height;
                  canvas.width = viewport.width;
                  viewerEl.appendChild(canvas);
                  return page.render({ canvasContext: context, viewport: viewport }).promise;
                });
              };

              var chain = Promise.resolve();
              for (var i = 1; i <= pdf.numPages; i++) {
                (function (n) {
                  chain = chain.then(function () { return renderPage(n); });
                })(i);
              }
              return chain;
            })
            .catch(function (err) {
              statusEl.textContent = 'Unable to load this PDF.';
              statusEl.style.display = 'block';
              post('error', err && err.message ? err.message : 'render_failed');
            });
        } catch (err) {
          statusEl.textContent = 'Unable to load this PDF.';
          post('error', err && err.message ? err.message : 'init_failed');
        }
      })();
    </script>
  </body>
</html>`
}

async function downloadPdfBase64(pdfUrl: string, fileId: string) {
  const cacheDir = new Directory(Paths.cache, 'study-materials')
  if (!cacheDir.exists) {
    cacheDir.create({ intermediates: true, idempotent: true })
  }

  const destination = new File(cacheDir, `${fileId}.pdf`)
  const file = destination.exists
    ? destination
    : await File.downloadFileAsync(pdfUrl, destination, { idempotent: true })

  return file.base64()
}

export function PdfViewer({ fileId }: { fileId: string }) {
  const theme = useColorScheme()
  const isDark = theme === 'dark'
  const backgroundColor = THEME[theme ?? 'light'].background
  const pdfUrl = getPdfUrl(fileId)

  const [base64, setBase64] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(true)
  const [isRendering, setIsRendering] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!pdfUrl) {
      setErrorMessage('Upload configuration is missing.')
      setIsDownloading(false)
      return
    }

    const requestId = ++requestIdRef.current
    setIsDownloading(true)
    setIsRendering(false)
    setErrorMessage(null)
    setBase64(null)

    void downloadPdfBase64(pdfUrl, fileId)
      .then((data) => {
        if (requestId !== requestIdRef.current) return
        setBase64(data)
        setIsRendering(true)
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return
        setErrorMessage('Unable to download this study material.')
      })
      .finally(() => {
        if (requestId !== requestIdRef.current) return
        setIsDownloading(false)
      })
  }, [fileId, pdfUrl])

  const html = useMemo(
    () => (base64 ? buildPdfHtml(base64, isDark) : null),
    [base64, isDark],
  )

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as {
        type?: string
      }
      if (payload.type === 'ready') {
        setIsRendering(false)
      }
      if (payload.type === 'error') {
        setIsRendering(false)
        setErrorMessage('Unable to open this study material.')
      }
    } catch {
      // ignore malformed messages
    }
  }

  const isLoading = isDownloading || isRendering

  return (
    <View style={{ backgroundColor, flex: 1 }}>
      {isLoading && !errorMessage ? (
        <View className="absolute inset-0 z-10 items-center justify-center">
          <ActivityIndicator size="small" />
        </View>
      ) : null}
      {errorMessage ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text variant="muted" className="text-center">
            {errorMessage}
          </Text>
        </View>
      ) : html ? (
        <WebView
          originWhitelist={['*']}
          source={{ html, baseUrl: 'https://cdnjs.cloudflare.com' }}
          style={{ flex: 1, backgroundColor: 'transparent' }}
          onMessage={handleMessage}
          onError={() => {
            setIsRendering(false)
            setErrorMessage('Unable to open this study material.')
          }}
          setSupportMultipleWindows={false}
          allowsLinkPreview={false}
          allowsBackForwardNavigationGestures={false}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          nestedScrollEnabled
        />
      ) : null}
    </View>
  )
}

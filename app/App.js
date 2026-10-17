import { StatusBar } from 'expo-status-bar';
import { useRef } from 'react';
import { Linking, Share, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import gameHtml from './game-html';

// HungryKatz on phones: the web game, packed into one offline page (scripts/bundle-game.mjs), full screen.
// The page posts messages for things a web page can't do inside an app: the share sheet, and saving or sharing
// a café photo; for photos we answer back so the game can show a banner. Links (e.g. the privacy policy) open
// in the phone's browser, so the game itself never navigates away.
const PAPER = '#fbefdf'; // the game's page colour, so there is no white flash while it starts
const BASE = 'https://hungrykatz.solutioncloud.tech/';

/** Photo mode: write the JPEG to the cache, then save it to the gallery (asking first) or open the share sheet. */
async function handlePhoto({ action, name, data }) {
  try {
    const file = new File(Paths.cache, name);
    await file.write(data, { encoding: 'base64' });
    if (action === 'share') {
      await Sharing.shareAsync(file.uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg', dialogTitle: 'Share your café' });
      return { action, ok: true };
    }
    const { granted } = await MediaLibrary.requestPermissionsAsync(true, ['photo']); // add-only, photos only
    if (!granted) return { action, ok: false };
    await MediaLibrary.saveToLibraryAsync(file.uri);
    return { action, ok: true };
  } catch {
    return { action, ok: false };
  }
}

/** Keep the game page; send any other link to the browser. */
function onNavigate({ url }) {
  if (url === BASE || url.startsWith('about:') || url.startsWith('data:')) return true;
  Linking.openURL(url).catch(() => {});
  return false;
}

export default function App() {
  const web = useRef(null);

  async function onMessage(event) {
    let msg;
    try { msg = JSON.parse(event.nativeEvent.data); } catch { return; }
    if (msg?.type === 'share') Share.share({ message: `${msg.text} ${msg.url}`, url: msg.url, title: 'HungryKatz' }).catch(() => {});
    if (msg?.type === 'photo') {
      const result = await handlePhoto(msg);
      web.current?.injectJavaScript(`window.hungryKatzPhotoDone && window.hungryKatzPhotoDone(${JSON.stringify(result)}); true;`);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <WebView
        ref={web}
        style={styles.root}
        originWhitelist={['*']}
        // baseUrl gives the page a stable origin, so saves (localStorage) persist between launches
        source={{ html: gameHtml, baseUrl: BASE }}
        onShouldStartLoadWithRequest={onNavigate}
        javaScriptEnabled
        domStorageEnabled
        onMessage={onMessage}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        bounces={false}
        overScrollMode="never"
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        textZoom={100}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAPER },
});

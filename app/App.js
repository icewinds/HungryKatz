import { StatusBar } from 'expo-status-bar';
import { Share, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import gameHtml from './game-html';

// HungryKatz on phones: the web game, packed into one offline page (scripts/bundle-game.mjs), full screen.
// The page tells us when the player taps Share, and we open the phone's own share sheet.
const PAPER = '#fbefdf'; // the game's page colour, so there is no white flash while it starts

function onMessage(event) {
  let msg;
  try { msg = JSON.parse(event.nativeEvent.data); } catch { return; }
  if (msg?.type === 'share') Share.share({ message: `${msg.text} ${msg.url}`, url: msg.url, title: 'HungryKatz' }).catch(() => {});
}

export default function App() {
  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <WebView
        style={styles.root}
        originWhitelist={['*']}
        // baseUrl gives the page a stable origin, so saves (localStorage) persist between launches
        source={{ html: gameHtml, baseUrl: 'https://hungrykatz.solutioncloud.tech/' }}
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

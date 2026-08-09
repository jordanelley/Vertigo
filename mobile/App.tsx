import { StatusBar } from 'expo-status-bar';
import { Button, StyleSheet, Text, View } from 'react-native';
import { Auth0Provider, useAuth0 } from 'react-native-auth0';

const domain = 'dev-74arexrqup207kmv.us.auth0.com';
const clientId = 'BaAM3pwzCMznlvySrTsNiNFrTUS4OmC3';

function HomeScreen() {
  const { authorize, clearSession, user, isLoading, error } = useAuth0();

  const handleLogin = async () => {
    try {
      await authorize({ scope: 'openid profile email' });
    } catch (e) {
      console.error('Login error:', e);
    }
  };

  const handleLogout = async () => {
    try {
      await clearSession();
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {user ? (
        <>
          <Text>Logged in as {user.email}</Text>
          <Button title="Log Out" onPress={handleLogout} />
        </>
      ) : (
        <>
          {error && <Text>Error: {error.message}</Text>}
          <Button title="Log In" onPress={handleLogin} />
        </>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return (
    <Auth0Provider domain={domain} clientId={clientId}>
      <HomeScreen />
    </Auth0Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
});

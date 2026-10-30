import { useMemo } from 'react';
import { Pressable, Text } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme as NavDefaultTheme,
  DarkTheme as NavDarkTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import BoxesScreen from './screens/BoxesScreen';
import BoxItemsScreen from './screens/BoxItemsScreen';
import AddItemScreen from './screens/AddItemScreen';
import ItemDetailScreen from './screens/ItemDetailScreen';
import CompletedOrdersScreen from './screens/CompletedOrdersScreen';
import PurchasesScreen from './screens/PurchasesScreen';
import LinkEbayScreen from './screens/LinkEbayScreen';
import SettingsScreen from './screens/SettingsScreen';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { colors, isDark } = useTheme();

  const navTheme = useMemo(() => {
    const base = isDark ? NavDarkTheme : NavDefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
        notification: colors.primary,
      },
    };
  }, [colors, isDark]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: { color: colors.text },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen
            name="Boxes"
            component={BoxesScreen}
            options={({ navigation }) => ({
              title: 'My Boxes',
              headerRight: () => (
                <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={8}>
                  <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>
                    Settings
                  </Text>
                </Pressable>
              ),
            })}
          />
          <Stack.Screen name="BoxItems" component={BoxItemsScreen} options={{ title: 'Box Items' }} />
          <Stack.Screen name="AddItem" component={AddItemScreen} options={{ title: 'Add Item' }} />
          <Stack.Screen name="CompletedOrders" component={CompletedOrdersScreen} options={{ title: 'Completed Orders' }} />
          <Stack.Screen name="Purchases" component={PurchasesScreen} options={{ title: 'Purchases' }} />
          <Stack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: 'Item Details' }} />
          <Stack.Screen name="LinkEbay" component={LinkEbayScreen} options={{ title: 'Link to eBay' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

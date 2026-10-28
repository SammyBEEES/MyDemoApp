import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BoxesScreen from './screens/BoxesScreen';
import BoxItemsScreen from './screens/BoxItemsScreen';
import AddItemScreen from './screens/AddItemScreen';
import ItemDetailScreen from './screens/ItemDetailScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Boxes" component={BoxesScreen} options={{ title: 'My Boxes' }} />
        <Stack.Screen name="BoxItems" component={BoxItemsScreen} options={{ title: 'Box Items' }} />
        <Stack.Screen name="AddItem" component={AddItemScreen} options={{ title: 'Add Item' }} />
        <Stack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: 'Item Details' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

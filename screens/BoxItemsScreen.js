import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Button, StyleSheet } from 'react-native';
import { initDB } from '../db/init';
import { getItemsByBoxId } from '../services/inventoryRepo';

export default function BoxItemsScreen({ route, navigation }) {
  const { box } = route.params || {};
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      await initDB();
      if (box?.id) {
        const data = await getItemsByBoxId(box.id);
        setItems(data || []);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
  }, [navigation]);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('ItemDetail', { item })}>
      {item.imageUri ? <Image source={{ uri: item.imageUri }} style={styles.thumb} /> : <View style={styles.thumbPlaceholder} />}
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>Qty: {item.quantity}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Button title="Add Item to this Box" onPress={() => navigation.navigate('AddItem', { boxId: box?.id })} />
      {loading ? (
        <Text>Loading...</Text>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>No items in this box yet.</Text>
      ) : (
        <FlatList data={items} keyExtractor={(item) => item.id} renderItem={renderItem} contentContainerStyle={styles.list} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  list: { paddingTop: 10 },
  item: { flexDirection: 'row', padding: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 6, marginBottom: 8, alignItems: 'center' },
  thumb: { width: 60, height: 60, borderRadius: 4, marginRight: 10 },
  thumbPlaceholder: { width: 60, height: 60, borderRadius: 4, marginRight: 10, backgroundColor: '#f0f0f0' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold' },
  meta: { color: '#666' },
  empty: { textAlign: 'center', marginTop: 20, color: '#666' },
});

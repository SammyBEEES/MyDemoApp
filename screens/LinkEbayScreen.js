import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, Button, Alert } from 'react-native';
import { getEbayListings } from '../services/ebay';
import { linkItemToEbay } from '../services/inventoryRepo';

export default function LinkEbayScreen({ route, navigation }) {
  const { item } = route.params || {};
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getEbayListings();
      setListings(res.listings || []);
    } catch (e) {
      Alert.alert('Error', 'Make sure ebay-proxy is running on localhost:4000');
    } finally {
      setLoading(false);
    }
  };

  const link = async (listing) => {
    try {
      await linkItemToEbay(item.id, listing.itemId, listing.sku);
      Alert.alert('Linked', 'Item linked to eBay listing');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to link');
    }
  };

  return (
    <View style={styles.container}>
      <Button title={loading ? 'Loading...' : 'Load my eBay listings'} onPress={load} />
      <FlatList
        data={listings}
        keyExtractor={(l) => l.itemId}
        renderItem={({ item: l }) => (
          <TouchableOpacity style={styles.item} onPress={() => link(l)}>
            <Text style={styles.title}>{l.title}</Text>
            <Text style={styles.meta}>ID: {l.itemId} {l.sku ? `• SKU: ${l.sku}` : ''} • Qty: {l.quantity}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  item: { padding: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 6, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: 'bold' },
  meta: { color: '#666' },
});

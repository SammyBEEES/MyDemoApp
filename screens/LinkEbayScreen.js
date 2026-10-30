import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Button, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EBAY_PROXY_URL, getEbayListings } from '../services/ebay';
import { linkItemToEbay } from '../services/inventoryRepo';
import { useTheme } from '../theme/ThemeProvider';

export default function LinkEbayScreen({ route, navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { item } = route.params || {};
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getEbayListings();
      setListings(res.listings || []);
    } catch (e) {
      Alert.alert('Error', `Make sure ebay-proxy is reachable at ${EBAY_PROXY_URL}`);
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
      <View style={styles.header}>
        <Button title={loading ? 'Loading...' : 'Load my eBay listings'} onPress={load} />
      </View>
      <FlatList
        data={listings}
        keyExtractor={(l) => l.itemId}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? 'Loading listings...' : 'No listings loaded yet.'}
          </Text>
        }
        renderItem={({ item: l }) => (
          <TouchableOpacity style={styles.item} activeOpacity={0.75} onPress={() => link(l)}>
            <Text style={styles.title}>{l.title}</Text>
            <Text style={styles.meta}>
              ID: {l.itemId} {l.sku ? `• SKU: ${l.sku}` : ''} • Qty: {l.quantity}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: 16, paddingBottom: 4 },
    list: { paddingHorizontal: 16, paddingTop: 8 },
    item: {
      backgroundColor: colors.card,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: colors.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    title: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
    meta: { color: colors.muted },
    empty: { textAlign: 'center', marginTop: 24, color: colors.muted },
  });

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Button, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { initDB } from '../db/init';
import { getItemsByShippingStatus } from '../services/inventoryRepo';
import { importEbayOrders } from '../services/ebayImport';
import { useTheme } from '../theme/ThemeProvider';

const currentYear = () => new Date().getFullYear();

export default function CompletedOrdersScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const load = async () => {
    try {
      await initDB();
      const allDelivered = await getItemsByShippingStatus('delivered');
      const thisYear = currentYear();
      const completedThisYear = (allDelivered || []).filter((item) => {
        const createdAt = item.createdAt || 0;
        return new Date(createdAt).getFullYear() === thisYear;
      });
      setItems(completedThisYear);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const importFromEbay = async () => {
    if (importing) return;
    setImporting(true);
    try {
      const result = await importEbayOrders();
      Alert.alert(
        'Orders imported',
        `${result.imported} order(s) imported from eBay.${result.skipped ? ` ${result.skipped} already existed.` : ''}`
      );
      load();
    } catch (e) {
      Alert.alert('Error', `Failed to import from eBay: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
  }, [navigation]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.75}
      onPress={() => navigation.navigate('ItemDetail', { item })}
    >
      {item.imageUri ? (
        <Image source={{ uri: item.imageUri }} style={styles.thumb} />
      ) : (
        <View style={styles.thumbPlaceholder} />
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>
          Qty: {item.quantity} {item.location ? `• ${item.location}` : ''}
        </Text>
        <Text style={styles.meta}>
          {new Date(item.createdAt || 0).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Completed Orders ({currentYear()})</Text>
        <Text style={styles.subtitle}>{items.length} item(s) delivered</Text>
        <Button
          title={importing ? 'Importing...' : 'Import from eBay'}
          onPress={importFromEbay}
          disabled={importing}
        />
      </View>
      {loading ? (
        <Text style={styles.message}>Loading...</Text>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>
          No completed orders this year. Mark an item as “Delivered” on its
          detail screen to see it here.
        </Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        />
      )}
      <Button
        title="Back to Boxes"
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      />
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 16, paddingTop: 12, gap: 4 },
    title: { fontSize: 22, fontWeight: '700', color: colors.text },
    subtitle: { color: colors.muted, fontSize: 15 },
    list: { paddingHorizontal: 16, paddingTop: 12 },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 12,
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
    thumb: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
    thumbPlaceholder: {
      width: 60,
      height: 60,
      borderRadius: 8,
      marginRight: 12,
      backgroundColor: colors.thumb,
    },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
    meta: { color: colors.muted, fontSize: 14 },
    message: { color: colors.muted, marginTop: 20, textAlign: 'center' },
    empty: { textAlign: 'center', marginTop: 24, marginHorizontal: 24, color: colors.muted },
    backButton: { margin: 16 },
  });

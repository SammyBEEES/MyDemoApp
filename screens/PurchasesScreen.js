import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Button, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { initDB } from '../db/init';
import { getPurchases, getItemById } from '../services/inventoryRepo';
import { useTheme } from '../theme/ThemeProvider';

export default function PurchasesScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      await initDB();
      const data = await getPurchases();
      setPurchases(data || []);
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

  const total = purchases.reduce((sum, p) => sum + (parseFloat(p.cost) || 0), 0);

  const goToItem = async (purchase) => {
    if (!purchase.itemId) return;
    try {
      await initDB();
      const item = await getItemById(purchase.itemId);
      if (item) {
        navigation.navigate('ItemDetail', { item });
      } else {
        Alert.alert('Item not found', 'The linked item could not be found.');
      }
    } catch {
      Alert.alert('Error', 'Failed to load item');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.75}
      onPress={() => goToItem(item)}
    >
      <View style={styles.info}>
        <Text style={styles.name}>{item.itemName || 'Unknown Item'}</Text>
        <Text style={styles.meta}>
          {formatCurrency(item.cost)} • {item.quantity} unit(s)
          {item.supplier ? ` • ${item.supplier}` : ''}
        </Text>
        <Text style={styles.meta}>{formatDate(item.purchaseDate)}</Text>
        {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
      </View>
      <Text style={styles.cost}>{formatCurrency(item.cost)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Purchases</Text>
        <Text style={styles.subtitle}>
          Total spent: {formatCurrency(total)} ({purchases.length} purchase(s))
        </Text>
      </View>
      {loading ? (
        <Text style={styles.message}>Loading...</Text>
      ) : purchases.length === 0 ? (
        <Text style={styles.empty}>
          No purchases yet. Add purchase details when creating an item.
        </Text>
      ) : (
        <FlatList
          data={purchases}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        />
      )}
      <View style={styles.buttonRow}>
        <Button title="Back to Boxes" onPress={() => navigation.goBack()} />
      </View>
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
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
    meta: { color: colors.muted, fontSize: 14 },
    notes: { color: colors.muted, fontSize: 13, fontStyle: 'italic', marginTop: 2 },
    cost: { fontSize: 16, fontWeight: '700', color: colors.primary },
    message: { color: colors.muted, marginTop: 20, textAlign: 'center' },
    empty: { textAlign: 'center', marginTop: 24, marginHorizontal: 24, color: colors.muted },
    buttonRow: { flexDirection: 'row', justifyContent: 'center', margin: 16 },
  });

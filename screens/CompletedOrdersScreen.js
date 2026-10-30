import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, Image, Button, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getEbayOrders } from '../services/ebay';
import { useTheme } from '../theme/ThemeProvider';

export default function CompletedOrdersScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getEbayOrders();
      setOrders(result.orders || []);
    } catch (e) {
      setError(e.message || 'Failed to load eBay orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const formatPrice = (price, currency) => {
    const amount = Number(price);
    if (!Number.isFinite(amount)) return 'Price unavailable';
    if (currency) {
      try {
        return new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency,
        }).format(amount);
      } catch {}
    }
    return amount.toFixed(2);
  };

  const formatDate = (date) => {
    if (!date) return 'Date unavailable';
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? 'Date unavailable' : parsed.toLocaleDateString();
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      {item.picture ? (
        <Image source={{ uri: item.picture }} style={styles.thumb} />
      ) : (
        <View style={styles.thumbPlaceholder} />
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{item.title || 'Untitled eBay item'}</Text>
        <Text style={styles.meta}>Buyer: {item.buyer || 'Not provided'}</Text>
        <Text style={styles.meta}>Order: {item.orderId || 'Unavailable'}</Text>
        <Text style={styles.meta}>Qty: {item.quantity} | {formatDate(item.createdDate)}</Text>
        <Text style={styles.meta}>Status: {item.shippingStatus || 'Unknown'}</Text>
        <Text style={styles.price}>{formatPrice(item.price, item.currency)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>{orders.length} order line(s)</Text>
        <Button title={loading ? 'Loading...' : 'Refresh Orders'} onPress={load} disabled={loading} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <Text style={styles.message}>Loading...</Text>
      ) : orders.length === 0 && !error ? (
        <Text style={styles.empty}>
          No eBay sales orders were returned. Confirm the eBay proxy is running
          and your seller token is configured. eBay returns up to 90 days of
          order history here.
        </Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item, index) => `${item.orderId || 'order'}-${item.transactionId || index}`}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        />
      )}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 16, paddingTop: 12, gap: 4 },
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
    price: { color: colors.primary, fontSize: 15, fontWeight: '700', marginTop: 4 },
    message: { color: colors.muted, marginTop: 20, textAlign: 'center' },
    error: { textAlign: 'center', margin: 16, color: colors.error || '#b00020' },
    empty: { textAlign: 'center', marginTop: 24, marginHorizontal: 24, color: colors.muted },
  });

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Button,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { initDB } from '../db/init';
import { getPurchasesByItemId, addPurchase, updateItem } from '../services/inventoryRepo';
import { useTheme } from '../theme/ThemeProvider';

const DetailRow = ({ label, value, styles }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

export default function ItemDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { item } = route.params || {};
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addPurchaseVisible, setAddPurchaseVisible] = useState(false);
  const [purchaseCost, setPurchaseCost] = useState('');
  const [purchaseQuantity, setPurchaseQuantity] = useState('1');
  const [supplier, setSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');

  if (!item) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>No item</Text>
      </View>
    );
  }

  const loadPurchases = async () => {
    try {
      await initDB();
      const data = await getPurchasesByItemId(item.id);
      setPurchases(data || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadPurchases);
    loadPurchases();
    return unsub;
  }, [navigation, item.id]);

  const totalCost = purchases.reduce((sum, p) => sum + (parseFloat(p.cost) || 0), 0);
  const totalQty = purchases.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);

  const savePurchase = async () => {
    const cost = parseFloat(purchaseCost);
    if (isNaN(cost) || cost <= 0) {
      Alert.alert('Invalid cost', 'Please enter a valid purchase cost');
      return;
    }
    try {
      await addPurchase({
        itemId: item.id,
        cost,
        quantity: parseInt(purchaseQuantity) || 1,
        purchaseDate: purchaseDate || Date.now(),
        supplier: supplier.trim() || null,
        notes: purchaseNotes.trim() || null,
      });
      setPurchaseCost('');
      setPurchaseQuantity('1');
      setSupplier('');
      setPurchaseDate('');
      setPurchaseNotes('');
      setAddPurchaseVisible(false);
      loadPurchases();
    } catch (e) {
      Alert.alert('Error', 'Failed to add purchase');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value || 0);
  };

  const formatDate = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString();
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}>
      {item.imageUri ? <Image source={{ uri: item.imageUri }} style={styles.image} /> : null}
      <Text style={styles.title}>{item.name}</Text>
      <View style={styles.card}>
        <DetailRow label="Description" value={item.description || '-'} styles={styles} />
        <DetailRow label="Quantity" value={String(item.quantity)} styles={styles} />
        <DetailRow label="Location" value={item.location || '-'} styles={styles} />
        <DetailRow label="Category" value={item.category || '-'} styles={styles} />
        <DetailRow label="Barcode" value={item.barcode || '-'} styles={styles} />
        <DetailRow label="Shipping Status" value={item.shippingStatus || 'pending'} styles={styles} />
        <DetailRow
          label="Total Purchased"
          value={`${formatCurrency(totalCost)} across ${purchases.length} purchase(s) / ${totalQty} unit(s)`}
          styles={styles}
        />
        {item.ebayItemId ? (
          <DetailRow label="eBay" value={String(item.ebayItemId)} styles={styles} />
        ) : null}
      </View>
      {item.ebayItemId ? <Text style={styles.linked}>Linked to eBay: {item.ebayItemId}</Text> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Purchase History</Text>
        {loading ? (
          <Text style={styles.message}>Loading...</Text>
        ) : purchases.length === 0 ? (
          <Text style={styles.empty}>No purchases recorded for this item.</Text>
        ) : (
          purchases.map((p) => (
            <View key={p.id} style={styles.purchaseRow}>
              <View style={styles.purchaseInfo}>
                <Text style={styles.purchaseCost}>{formatCurrency(p.cost)}</Text>
                <Text style={styles.purchaseMeta}>
                  {p.quantity} unit(s) • {formatDate(p.purchaseDate)}
                  {p.supplier ? ` • ${p.supplier}` : ''}
                </Text>
                {p.notes ? <Text style={styles.purchaseNotes}>{p.notes}</Text> : null}
              </View>
            </View>
          ))
        )}
        <Button title="Add Purchase" onPress={() => setAddPurchaseVisible(true)} />
      </View>

      {addPurchaseVisible && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Add Purchase</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Purchase cost (total, e.g. 2000)"
            placeholderTextColor={colors.muted}
            value={purchaseCost}
            onChangeText={setPurchaseCost}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Quantity (units, e.g. 50)"
            placeholderTextColor={colors.muted}
            value={purchaseQuantity}
            onChangeText={setPurchaseQuantity}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Supplier (optional)"
            placeholderTextColor={colors.muted}
            value={supplier}
            onChangeText={setSupplier}
          />
          <TextInput
            style={styles.input}
            placeholder="Date YYYY-MM-DD (optional)"
            placeholderTextColor={colors.muted}
            value={purchaseDate}
            onChangeText={setPurchaseDate}
          />
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Notes (optional)"
            placeholderTextColor={colors.muted}
            value={purchaseNotes}
            onChangeText={setPurchaseNotes}
            multiline
          />
          <View style={styles.actions}>
            <Button title="Save Purchase" onPress={savePurchase} />
            <Button title="Cancel" onPress={() => setAddPurchaseVisible(false)} />
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <Button title="Link to eBay Listing" onPress={() => navigation.navigate('LinkEbay', { item })} />
        <Button title="Back" onPress={() => navigation.goBack()} />
      </View>
    </ScrollView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { padding: 16, backgroundColor: colors.background },
    empty: { color: colors.muted, textAlign: 'center', marginTop: 24 },
    title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 12 },
    image: { width: '100%', height: 200, marginBottom: 12, borderRadius: 12 },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      marginBottom: 12,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowLabel: { color: colors.muted, fontWeight: '600', marginRight: 12 },
    rowValue: { color: colors.text, flexShrink: 1, textAlign: 'right' },
    linked: { color: colors.success, marginBottom: 12, fontWeight: '600' },
    actions: { gap: 10, marginTop: 8 },
    section: { marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
    message: { color: colors.muted, marginTop: 20, textAlign: 'center' },
    purchaseRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    purchaseInfo: { flex: 1 },
    purchaseCost: { fontSize: 15, fontWeight: '700', color: colors.primary },
    purchaseMeta: { color: colors.muted, fontSize: 13 },
    purchaseNotes: { color: colors.muted, fontSize: 13, fontStyle: 'italic', marginTop: 2 },
    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      padding: 10,
      marginBottom: 10,
      borderRadius: 8,
    },
    multiline: { minHeight: 80, textAlignVertical: 'top' },
  });

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Button,
  StyleSheet,
  Alert,
  Picker,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { initDB } from '../db/init';
import {
  getPurchases,
  getUngroupedItems,
  addPurchase,
  linkItemToPurchase,
  updatePurchaseStatus,
  addItem,
} from '../services/inventoryRepo';
import { useTheme } from '../theme/ThemeProvider';

export default function PurchasesScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [purchases, setPurchases] = useState([]);
  const [ungroupedItems, setUngroupedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkingItem, setLinkingItem] = useState(null);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');
  const [newPurchaseVisible, setNewPurchaseVisible] = useState(false);
  const [newPurchaseCost, setNewPurchaseCost] = useState('');
  const [newPurchaseQty, setNewPurchaseQty] = useState('1');
  const [newPurchaseSupplier, setNewPurchaseSupplier] = useState('');
  const [newPurchaseNotes, setNewPurchaseNotes] = useState('');

  const load = useCallback(async () => {
    try {
      await initDB();
      const [purchasesData, ungroupedData] = await Promise.all([
        getPurchases(),
        getUngroupedItems(),
      ]);
      setPurchases(purchasesData || []);
      setUngroupedItems(ungroupedData || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
  }, [navigation, load]);

  const total = purchases.reduce((sum, p) => sum + (parseFloat(p.cost) || 0), 0);

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

  const statusColor = (status) => {
    return status === 'closed' ? '#b00020' : colors.primary;
  };

  const togglePurchaseStatus = async (purchase) => {
    const next = purchase.status === 'ongoing' ? 'closed' : 'ongoing';
    try {
      await updatePurchaseStatus(purchase.id, next);
      load();
    } catch {
      Alert.alert('Error', 'Failed to update purchase status');
    }
  };

  const linkItem = async (itemId) => {
    if (!selectedPurchaseId) {
      Alert.alert('Select a purchase', 'Please choose a purchase to link this item to.');
      return;
    }
    try {
      await linkItemToPurchase(itemId, selectedPurchaseId);
      setLinkingItem(null);
      setSelectedPurchaseId('');
      load();
    } catch {
      Alert.alert('Error', 'Failed to link item to purchase');
    }
  };

  const createPurchase = async () => {
    const cost = parseFloat(newPurchaseCost);
    if (isNaN(cost) || cost <= 0) {
      Alert.alert('Invalid cost', 'Please enter a valid purchase cost');
      return;
    }
    try {
      await addPurchase({
        cost,
        quantity: parseInt(newPurchaseQty) || 1,
        purchaseDate: Date.now(),
        supplier: newPurchaseSupplier.trim() || null,
        notes: newPurchaseNotes.trim() || null,
        status: 'ongoing',
      });
      setNewPurchaseVisible(false);
      setNewPurchaseCost('');
      setNewPurchaseQty('1');
      setNewPurchaseSupplier('');
      setNewPurchaseNotes('');
      load();
    } catch (e) {
      Alert.alert('Error', 'Failed to create purchase');
    }
  };

  const addItemToPurchase = async (purchaseId, itemName) => {
    const name = prompt(`Enter item name to add to "${itemName}" purchase:`);
    if (!name) return;
    try {
      await initDB();
      const itemId = await addItem({
        name,
        category: 'Purchased',
        shippingStatus: 'pending',
      });
      await linkItemToPurchase(itemId, purchaseId);
      load();
    } catch (e) {
      Alert.alert('Error', 'Failed to add item to purchase');
    }
  };

  const renderPurchase = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.75}
    >
      <View style={styles.info}>
        <View style={styles.purchaseHeader}>
          <Text style={styles.name}>
            {item.itemName ? `Purchase for "${item.itemName}"` : 'Group Purchase'}
          </Text>
          <Text style={[
            styles.statusBadge,
            { backgroundColor: statusColor(item.status) },
          ]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.meta}>
          {formatCurrency(item.cost)} • {item.quantity} unit(s)
          {item.supplier ? ` • ${item.supplier}` : ''}
        </Text>
        <Text style={styles.meta}>
          {formatDate(item.purchaseDate)} • {item.linkedItemCount} item(s) linked
        </Text>
        {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
      </View>
      <View style={styles.actions}>
        <Button
          title={item.status === 'ongoing' ? 'Close' : 'Reopen'}
          onPress={() => togglePurchaseStatus(item)}
          color={statusColor(item.status)}
        />
        {item.status === 'ongoing' && (
          <Button
            title="Add Item"
            onPress={() => addItemToPurchase(item.id, item.itemName || 'this purchase')}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderUngroupedItem = ({ item }) => (
    <TouchableOpacity style={styles.ungroupedItem} activeOpacity={0.75}>
      <View style={styles.ungroupedInfo}>
        <Text style={styles.ungroupedName}>{item.name}</Text>
        <Text style={styles.ungroupedMeta}>
          Qty: {item.quantity} {item.category ? `• ${item.category}` : ''}
        </Text>
      </View>
      {linkingItem === item.id ? (
        <View style={styles.linkRow}>
          <Picker
            selectedValue={selectedPurchaseId}
            onValueChange={setSelectedPurchaseId}
            style={styles.picker}
          >
            <Picker.Item label="Select a purchase..." value="" />
            {purchases.map((p) => (
              <Picker.Item
                key={p.id}
                label={`${p.itemName ? `Purchase for "${p.itemName}"` : 'Group Purchase'} (${formatCurrency(p.cost)})`}
                value={p.id}
              />
            ))}
          </Picker>
          <Button title="Link" onPress={() => linkItem(item.id)} />
        </View>
      ) : (
        <Button title="Link to Purchase" onPress={() => setLinkingItem(item.id)} />
      )}
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
      ) : (
        <>
          {purchases.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Purchases</Text>
              <FlatList
                data={purchases}
                keyExtractor={(item) => item.id}
                renderItem={renderPurchase}
                contentContainerStyle={styles.list}
              />
            </>
          ) : null}

          {ungroupedItems.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Ungrouped Items</Text>
              <Text style={styles.ungroupedHint}>
                Items not yet linked to a purchase. Tap "Link to Purchase" to connect them.
              </Text>
              <FlatList
                data={ungroupedItems}
                keyExtractor={(item) => item.id}
                renderItem={renderUngroupedItem}
                contentContainerStyle={styles.list}
              />
            </>
          ) : null}
        </>
      )}

      <View style={styles.buttonRow}>
        <Button
          title={newPurchaseVisible ? 'Cancel' : 'Add Purchase'}
          onPress={() => setNewPurchaseVisible(!newPurchaseVisible)}
        />
        <Button title="Back to Boxes" onPress={() => navigation.goBack()} />
      </View>

      {newPurchaseVisible && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>New Purchase</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Purchase cost (total, e.g. 2000)"
            placeholderTextColor={colors.muted}
            value={newPurchaseCost}
            onChangeText={setNewPurchaseCost}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Quantity (units, e.g. 50)"
            placeholderTextColor={colors.muted}
            value={newPurchaseQty}
            onChangeText={setNewPurchaseQty}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Supplier (optional)"
            placeholderTextColor={colors.muted}
            value={newPurchaseSupplier}
            onChangeText={setNewPurchaseSupplier}
          />
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Notes (optional)"
            placeholderTextColor={colors.muted}
            value={newPurchaseNotes}
            onChangeText={setNewPurchaseNotes}
            multiline
          />
          <View style={styles.actions}>
            <Button title="Create Purchase" onPress={createPurchase} />
            <Button title="Cancel" onPress={() => setNewPurchaseVisible(false)} />
          </View>
        </View>
      )}
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
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16, marginHorizontal: 16 },
    ungroupedHint: { color: colors.muted, fontSize: 14, marginHorizontal: 16, marginBottom: 8 },
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
    purchaseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    name: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
    statusBadge: {
      fontSize: 11,
      fontWeight: '700',
      color: '#fff',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    meta: { color: colors.muted, fontSize: 14 },
    notes: { color: colors.muted, fontSize: 13, fontStyle: 'italic', marginTop: 2 },
    actions: { gap: 8 },
    ungroupedItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
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
    ungroupedInfo: { flex: 1 },
    ungroupedName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 2 },
    ungroupedMeta: { color: colors.muted, fontSize: 14 },
    linkRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 },
    picker: {
      flex: 1,
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      padding: 8,
      borderRadius: 8,
    },
    message: { color: colors.muted, marginTop: 20, textAlign: 'center' },
    buttonRow: { flexDirection: 'row', gap: 8, margin: 16 },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      marginHorizontal: 16,
      marginBottom: 12,
    },
    section: { marginBottom: 16 },
    sectionTitle2: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
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
    actions: { gap: 10, marginTop: 8 },
  });

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Button,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ScrollView,
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
  const [newPurchaseVisible, setNewPurchaseVisible] = useState(false);
  const [newPurchaseCost, setNewPurchaseCost] = useState('');
  const [newPurchaseQty, setNewPurchaseQty] = useState('1');
  const [newPurchaseSupplier, setNewPurchaseSupplier] = useState('');
  const [newPurchaseNotes, setNewPurchaseNotes] = useState('');
  const [addItemModalVisible, setAddItemModalVisible] = useState(false);
  const [addItemName, setAddItemName] = useState('');
  const [addItemPurchaseId, setAddItemPurchaseId] = useState(null);

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

  const linkItem = async (itemId, purchaseId) => {
    try {
      await linkItemToPurchase(itemId, purchaseId);
      setLinkingItem(null);
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

  const openAddItemModal = (purchaseId) => {
    setAddItemPurchaseId(purchaseId);
    setAddItemName('');
    setAddItemModalVisible(true);
  };

  const saveNewItemToPurchase = async () => {
    if (!addItemName.trim()) {
      Alert.alert('Missing name', 'Please enter an item name');
      return;
    }
    try {
      await initDB();
      const itemId = await addItem({
        name: addItemName.trim(),
        category: 'Purchased',
        shippingStatus: 'pending',
      });
      await linkItemToPurchase(itemId, addItemPurchaseId);
      setAddItemModalVisible(false);
      setAddItemPurchaseId(null);
      setAddItemName('');
      load();
    } catch (e) {
      Alert.alert('Error', 'Failed to add item to purchase');
    }
  };

  const renderPurchase = ({ item }) => (
    <View style={styles.item}>
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
            onPress={() => openAddItemModal(item.id)}
          />
        )}
      </View>
    </View>
  );

  const renderUngroupedItem = ({ item }) => (
    <View style={styles.ungroupedItem}>
      <View style={styles.ungroupedInfo}>
        <Text style={styles.ungroupedName}>{item.name}</Text>
        <Text style={styles.ungroupedMeta}>
          Qty: {item.quantity} {item.category ? `• ${item.category}` : ''}
        </Text>
      </View>
      {linkingItem === item.id ? (
        <View style={styles.linkRow}>
          <Text style={styles.linkHint}>Select a purchase:</Text>
          <FlatList
            horizontal
            data={purchases}
            keyExtractor={(p) => p.id}
            renderItem={({ item: p }) => (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => linkItem(item.id, p.id)}
              >
                <Text style={styles.linkButtonText}>
                  {p.itemName ? `"${p.itemName}"` : 'Group'} ({formatCurrency(p.cost)})
                </Text>
              </TouchableOpacity>
            )}
          />
          <Button title="Cancel" onPress={() => setLinkingItem(null)} />
        </View>
      ) : (
        <Button title="Link to Purchase" onPress={() => setLinkingItem(item.id)} />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
                  scrollEnabled={false}
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
                  scrollEnabled={false}
                />
              </>
            ) : null}

            {purchases.length === 0 && ungroupedItems.length === 0 ? (
              <Text style={styles.empty}>
                No purchases yet. Tap "Add Purchase" to create one.
              </Text>
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
      </ScrollView>

      <Modal visible={addItemModalVisible} transparent animationType="slide" onRequestClose={() => setAddItemModalVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Item to Purchase</Text>
            <TextInput
              style={styles.input}
              placeholder="Item name"
              placeholderTextColor={colors.muted}
              value={addItemName}
              onChangeText={setAddItemName}
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" onPress={() => setAddItemModalVisible(false)} />
              <Button title="Save Item" onPress={saveNewItemToPurchase} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingBottom: 32 },
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
    linkRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
    linkHint: { color: colors.muted, fontSize: 14 },
    linkButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      marginRight: 8,
    },
    linkButtonText: { color: colors.primaryText, fontSize: 13, fontWeight: '600' },
    message: { color: colors.muted, marginTop: 20, textAlign: 'center' },
    empty: { textAlign: 'center', marginTop: 24, marginHorizontal: 24, color: colors.muted },
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
    modalBg: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 20 },
    modal: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 12 },
    modalActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
  });

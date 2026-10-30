import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, Button, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

  if (!item) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>No item</Text>
      </View>
    );
  }

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
        {item.ebayItemId ? (
          <DetailRow label="eBay" value={String(item.ebayItemId)} styles={styles} />
        ) : null}
      </View>
      {item.ebayItemId ? <Text style={styles.linked}>Linked to eBay: {item.ebayItemId}</Text> : null}
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
    actions: { gap: 10 },
  });

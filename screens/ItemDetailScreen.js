import React from 'react';
import { View, Text, Image, StyleSheet, Button } from 'react-native';

export default function ItemDetailScreen({ route, navigation }) {
  const { item } = route.params || {};
  if (!item) return <View style={styles.container}><Text>No item</Text></View>;

  return (
    <View style={styles.container}>
      {item.imageUri ? <Image source={{ uri: item.imageUri }} style={styles.image} /> : null}
      <Text style={styles.title}>{item.name}</Text>
      <Text>Description: {item.description || '-'}</Text>
      <Text>Quantity: {item.quantity}</Text>
      <Text>Location: {item.location || '-'}</Text>
      <Text>Category: {item.category || '-'}</Text>
      {item.ebayItemId ? <Text style={styles.linked}>Linked to eBay: {item.ebayItemId}</Text> : null}
      <Button title="Link to eBay Listing" onPress={() => navigation.navigate('LinkEbay', { item })} />
      <Button title="Back" onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  image: { width: '100%', height: 200, marginBottom: 10 },
  linked: { color: '#2e7d32', marginTop: 8, marginBottom: 8 },
});

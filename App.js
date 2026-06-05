import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Switch,
  TextInput,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
  SectionList,
  Platform,
} from 'react-native';
import Checkbox from 'expo-checkbox';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// 1. Standard Packing Templates
const TEMPLATES = {
  essentials: [
    { id: '1', name: 'Toothbrush & Paste', category: 'Hygiene' },
    { id: '2', name: 'Phone Charger', category: 'Tech' },
    { id: '3', name: 'Wallet & ID', category: 'Docs' },
  ],
  shortTrip: [
    { id: '4', name: '2x Outfits', category: 'Clothing' },
    { id: '5', name: 'Small Toiletry Bag', category: 'Hygiene' },
  ],
  longTrip: [
    { id: '6', name: '7x Outfits', category: 'Clothing' },
    { id: '7', name: 'Laundry Bag', category: 'Luggage' },
    { id: '8', name: 'Extra Shoes', category: 'Clothing' },
  ],
  kids: [
    { id: '9', name: 'Diapers & Wipes', category: 'Kids' },
    { id: '10', name: 'Comfort Toy', category: 'Kids' },
    { id: '11', name: 'Kids Snacks', category: 'Kids' },
  ],
};

// Helper to generate unique IDs for items
const generateUniqueId = () => Date.now().toString() + Math.random().toString(36).substring(2, 9);

// Storage Keys
const STORAGE_KEY_TRIPS = '@saved_trips';
const STORAGE_KEY_CATEGORIES = '@app_categories';

export default function App() {
  // Global state for navigation and data
  const [currentScreen, setCurrentScreen] = useState('tripList'); // 'tripList', 'addEditTrip', 'checklist', 'settings'
  const [savedTrips, setSavedTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null); // The trip currently being viewed/edited
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // State for the Add/Edit Trip form
  const [destination, setDestination] = useState('');
  const [currentTripItems, setCurrentTripItems] = useState([]); // Items for the trip being added/edited
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('General'); // Default category

  // State for category management
  const [categories, setCategories] = useState(['General', 'Clothing', 'Hygiene', 'Tech', 'Docs', 'Kids', 'Luggage', 'Other']);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Load data from storage on startup
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const jsonTrips = await AsyncStorage.getItem(STORAGE_KEY_TRIPS);
        const jsonCats = await AsyncStorage.getItem(STORAGE_KEY_CATEGORIES);
        
        if (jsonTrips !== null) {
          setSavedTrips(JSON.parse(jsonTrips));
        } else {
          // Default China trip if first time opening
          const defaultTrip = {
            id: 'default-china-trip',
            destination: 'China',
            packingList: [
              { id: 'china-1', name: 'Passport', category: 'Docs', packed: false },
              { id: 'china-2', name: 'Universal Adapter', category: 'Tech', packed: false },
              { id: 'china-3', name: 'Walking Shoes', category: 'Clothing', packed: false },
              { id: 'china-4', name: 'Hand Sanitizer', category: 'Hygiene', packed: false },
            ],
          };
          setSavedTrips([defaultTrip]);
        }

        if (jsonCats !== null) {
          setCategories(JSON.parse(jsonCats));
        }
        setIsDataLoaded(true);
      } catch (e) {
        console.error('Failed to load data', e);
      }
    };
    loadInitialData();
  }, []);

  // Save trips whenever they change
  useEffect(() => {
    if (isDataLoaded) {
      AsyncStorage.setItem(STORAGE_KEY_TRIPS, JSON.stringify(savedTrips))
        .catch(e => console.error('Failed to save trips', e));
    }
  }, [savedTrips, isDataLoaded]);

  // Save categories whenever they change
  useEffect(() => {
    if (isDataLoaded) {
      AsyncStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories))
        .catch(e => console.error('Failed to save categories', e));
    }
  }, [categories, isDataLoaded]);

  // Function to initialize form for adding a new trip
  const startAddTrip = () => {
    setDestination('');
    setCurrentTripItems([]);
    setNewItemName('');
    setNewItemCategory('General');
    setCurrentScreen('addEditTrip');
  };

  // Function to load an existing trip for editing
  const startEditTrip = (trip) => {
    setSelectedTrip(trip);
    setDestination(trip.destination);
    setCurrentTripItems(trip.packingList);
    setNewItemName('');
    setNewItemCategory('General');
    setCurrentScreen('addEditTrip');
  };

  // Function to save a new or edited trip
  const saveTrip = () => {
    if (!destination.trim()) return alert('Please enter a destination');

    if (selectedTrip) {
      // Editing existing trip
      setSavedTrips(prevTrips =>
        prevTrips.map(trip =>
          trip.id === selectedTrip.id
            ? { ...trip, destination, packingList: currentTripItems }
            : trip
        )
      );
    } else {
      // Creating new trip
      const newTrip = { id: generateUniqueId(), destination, packingList: currentTripItems };
      setSavedTrips(prevTrips => [...prevTrips, newTrip]);
    }
    setCurrentScreen('tripList'); // Go back to the list of trips
    setSelectedTrip(null); // Clear selected trip
  };

  // Logic to add a new item to the current trip's item list
  const addItemToCurrentTrip = () => {
    if (!newItemName.trim()) return alert('Please enter an item name.');
    const newItem = {
      id: generateUniqueId(),
      name: newItemName.trim(),
      category: newItemCategory,
      packed: false,
    };
    setCurrentTripItems(prevItems => [...prevItems, newItem]);
    setNewItemName(''); // Clear input field
  };

  // Logic to remove an item from the current trip's item list
  const removeItemFromCurrentTrip = (id) => {
    setCurrentTripItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  // Logic to open a trip's checklist
  const openChecklist = (trip) => {
    setSelectedTrip(trip);
    setCurrentScreen('checklist');
  };

  // Logic to toggle packed status for an item in the selected trip's checklist
  const togglePackedStatus = (itemId) => {
    if (!selectedTrip) return;

    const updatedPackingList = selectedTrip.packingList.map(item =>
      item.id === itemId ? { ...item, packed: !item.packed } : item
    );

    const updatedTrip = { ...selectedTrip, packingList: updatedPackingList };
    setSelectedTrip(updatedTrip); // Update the selected trip's state

    // Also update the trip in the main savedTrips array
    setSavedTrips(prevTrips =>
      prevTrips.map(trip => (trip.id === updatedTrip.id ? updatedTrip : trip))
    );
  };

  // Reset all items in the current checklist to unpacked
  const resetChecklist = () => {
    if (!selectedTrip) return;
    Alert.alert("Reset Checklist", "Are you sure you want to uncheck all items?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        onPress: () => {
          const resetList = selectedTrip.packingList.map(item => ({ ...item, packed: false }));
          const updatedTrip = { ...selectedTrip, packingList: resetList };
          setSelectedTrip(updatedTrip);
          setSavedTrips(prevTrips =>
            prevTrips.map(trip => (trip.id === updatedTrip.id ? updatedTrip : trip))
          );
        },
      },
    ]);
  };

  // Logic to delete a trip entirely
  const deleteTrip = (tripId) => {
    Alert.alert("Delete Trip", "Are you sure you want to delete this trip and its checklist?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        setSavedTrips(prev => prev.filter(t => t.id !== tripId));
      }}
    ]);
  };

  // Logic to show options (Edit/Delete) on long press
  const showTripOptions = (trip) => {
    Alert.alert(
      trip.destination,
      "What would you like to do?",
      [
        { text: "Edit", onPress: () => startEditTrip(trip) },
        { text: "Delete", style: "destructive", onPress: () => deleteTrip(trip.id) },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  // Logic to manage categories
  const addCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) return alert('Category already exists');
    setCategories(prev => [...prev, trimmed]);
    setNewCategoryName('');
  };

  const deleteCategory = (catToDelete) => {
    if (catToDelete === 'General') return;
    Alert.alert("Delete Category", `Are you sure you want to delete "${catToDelete}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", onPress: () => setCategories(prev => prev.filter(c => c !== catToDelete)) }
    ]);
  };

  // --- Render different screens based on currentScreen state ---

  const renderContent = () => {
    // 1. Trip List Screen
    if (currentScreen === 'tripList') {
      return (
        <>
        <StatusBar barStyle="dark-content" />
        <View style={styles.headerRow}>
          <Text style={styles.title}>Check my trip</Text>
          <TouchableOpacity onPress={() => setCurrentScreen('settings')}>
            <Text style={{ fontSize: 24 }}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={startAddTrip}>
          <Text style={styles.buttonText}>Add New Trip</Text>
        </TouchableOpacity>

        <FlatList
          data={savedTrips}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyListText}>No trips saved yet. Add one!</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.tripCard} 
              onPress={() => openChecklist(item)}
              onLongPress={() => showTripOptions(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.tripCardDestination}>{item.destination}</Text>
            </TouchableOpacity>
          )}
        />
        </>
      );
    }

    // 2. Add/Edit Trip Screen
    if (currentScreen === 'addEditTrip') {
      return (
        <>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.title}>{selectedTrip ? 'Edit Trip' : 'Add New Trip'}</Text>

        <ScrollView style={styles.card} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.label}>Destination</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Paris, Beach, Hiking..."
            value={destination}
            onChangeText={setDestination}
          />

          <View style={styles.sectionSpacer} />

          <Text style={styles.label}>Add Packing Item</Text>
          <View style={styles.addItemSection}>
            <TextInput
              style={styles.addItemInput}
              placeholder="Item name (e.g. Socks)"
              value={newItemName}
              onChangeText={setNewItemName}
            />
            <View style={styles.addItemControls}>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={newItemCategory}
                  onValueChange={(itemValue) => setNewItemCategory(itemValue)}
                  style={styles.picker}
                >
                  {categories.map(cat => (
                    <Picker.Item key={cat} label={cat} value={cat} />
                  ))}
                </Picker>
              </View>
              <TouchableOpacity style={styles.addItemButton} onPress={addItemToCurrentTrip}>
                <Text style={styles.buttonText}>Add to List</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionSpacer} />

          <Text style={styles.label}>Current Items ({currentTripItems.length})</Text>
          <View style={styles.itemsPreviewContainer}>
            {useMemo(() => {
              const grouped = currentTripItems.reduce((acc, item) => {
                if (!acc[item.category]) acc[item.category] = [];
                acc[item.category].push(item);
                return acc;
              }, {});
              
              return Object.entries(grouped)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([category, items]) => (
                  <View key={category}>
                    <Text style={styles.previewCategoryHeader}>{category}</Text>
                    {items.map((item) => (
                      <View key={item.id} style={styles.addedItemRow}>
                        <Text>{item.name}</Text>
                        <TouchableOpacity onPress={() => removeItemFromCurrentTrip(item.id)}>
                          <Text style={styles.removeItemText}>X</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ));
            }, [currentTripItems])}
            {currentTripItems.length === 0 && <Text style={styles.emptyText}>No items added yet.</Text>}
          </View>

          <TouchableOpacity style={[styles.button, { marginTop: 20 }]} onPress={saveTrip}>
            <Text style={styles.buttonText}>{selectedTrip ? 'Save Changes' : 'Save Trip'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setCurrentScreen('tripList')}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
        </>
      );
    }

    // 4. Settings Screen
    if (currentScreen === 'settings') {
      return (
        <>
        <StatusBar barStyle="dark-content" />
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Settings</Text>
          <TouchableOpacity onPress={() => setCurrentScreen('tripList')}>
            <Text style={styles.resetText}>Done</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Manage Categories</Text>
        <View style={styles.addItemSection}>
          <TextInput
            style={styles.addItemInput}
            placeholder="New category name"
            value={newCategoryName}
            onChangeText={setNewCategoryName}
          />
          <TouchableOpacity style={styles.addItemButton} onPress={addCategory}>
            <Text style={styles.buttonText}>Add Category</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={categories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <View style={styles.addedItemRow}>
              <Text style={styles.itemText}>{item}</Text>
              {item !== 'General' && (
                <TouchableOpacity onPress={() => deleteCategory(item)}>
                  <Text style={styles.removeItemText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
        </>
      );
    }

    // 3. Checklist Screen
    if (currentScreen === 'checklist' && selectedTrip) {
      const packedCount = selectedTrip.packingList.filter((item) => item.packed).length;
      const progress = selectedTrip.packingList.length > 0 ? packedCount / selectedTrip.packingList.length : 0;

      const sections = useMemo(() => {
        return selectedTrip.packingList.reduce((acc, item) => {
          const section = acc.find((s) => s.title === item.category);
          if (section) {
            section.data.push(item);
          } else {
            acc.push({ title: item.category, data: [item] });
          }
          return acc;
        }, []).sort((a, b) => a.title.localeCompare(b.title));
      }, [selectedTrip.packingList]);

      return (
        <>
        <StatusBar barStyle="dark-content" />
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Trip to {selectedTrip.destination}</Text>
          <TouchableOpacity onPress={resetChecklist}><Text style={styles.resetText}>Reset</Text></TouchableOpacity>
        </View>

        {/* Visual Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {packedCount} of {selectedTrip.packingList.length} items packed
        </Text>

        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.itemRow}
              onPress={() => togglePackedStatus(item.id)}
            >
              <Checkbox
                value={item.packed}
                onValueChange={() => togglePackedStatus(item.id)}
                color={item.packed ? '#4CAF50' : undefined}
              />
              <View style={styles.itemTextContainer}>
                <Text style={[styles.itemText, item.packed && styles.strikeThrough]}>
                  {item.name}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          stickySectionHeadersEnabled={false}
        />
        <TouchableOpacity style={styles.editTripButton} onPress={() => startEditTrip(selectedTrip)}>
          <Text style={styles.buttonText}>Edit Trip Details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => setCurrentScreen('tripList')}>
          <Text style={styles.buttonText}>Back to My Trips</Text>
        </TouchableOpacity>
        </>
      );
    }

    return <Text>Loading...</Text>;
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {renderContent()}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 20 },
  header: { fontSize: 22, fontWeight: 'bold', color: '#1A1C1E' },
  resetText: { color: '#6750A4', fontWeight: 'bold' },
  title: { fontSize: 32, fontWeight: '800', color: '#1A1C1E', marginTop: 20, marginBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  scrollContent: { padding: 20, paddingBottom: 60 },
  sectionSpacer: { height: 15 },
  label: { fontSize: 16, fontWeight: '600', color: '#49454F', marginBottom: 8 },
  input: { borderBottomWidth: 2, borderColor: '#6750A4', padding: 10, marginBottom: 30, fontSize: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  button: { backgroundColor: '#6750A4', padding: 18, borderRadius: 12, alignItems: 'center' },
  addButton: { backgroundColor: '#4CAF50', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  cancelButton: { backgroundColor: '#CCC', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  cancelButtonText: { color: '#333', fontWeight: 'bold', fontSize: 16 },
  editTripButton: { backgroundColor: '#FFC107', padding: 15, borderRadius: 12, alignItems: 'center', marginVertical: 10 },
  backButton: { backgroundColor: '#607D8B', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  itemRow: { flexDirection: 'row', backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center' },
  itemTextContainer: { marginLeft: 15 },
  itemText: { fontSize: 18, color: '#1A1C1E' },
  categoryText: { fontSize: 12, color: '#777', textTransform: 'uppercase' },
  strikeThrough: { textDecorationLine: 'line-through', color: '#AAA' },
  // Progress Bar Styles
  progressContainer: { height: 10, backgroundColor: '#E0E0E0', borderRadius: 5, marginBottom: 8, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#4CAF50' },
  progressText: { fontSize: 14, color: '#49454F', marginBottom: 20, textAlign: 'right', fontWeight: '600' },
  // Trip List Styles
  tripCard: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, marginBottom: 12 },
  tripCardDestination: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  tripCardDetails: { flexDirection: 'row', marginBottom: 10 },
  emptyListText: { textAlign: 'center', fontSize: 16, color: '#777', marginTop: 50 },
  // Improved Add/Edit Item Styles
  addItemSection: { marginBottom: 25 },
  addItemInput: { borderBottomWidth: 1, borderColor: '#6750A4', padding: 10, fontSize: 18, marginBottom: 10 },
  addItemControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerWrapper: { flex: 2, borderBottomWidth: 1, borderColor: '#DDD', marginRight: 10, height: 65, justifyContent: 'center' },
  picker: { height: 65, width: '100%' },
  addItemButton: { backgroundColor: '#6750A4', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  itemsPreviewContainer: { marginBottom: 30 },
  addedItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#EEE' },
  removeItemText: { color: '#BA1A1A', fontWeight: 'bold' },
  emptyText: { color: '#AAA', fontStyle: 'italic', textAlign: 'center', marginVertical: 10 },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: '#F5F7FA',
    paddingVertical: 10,
    color: '#6750A4',
    marginTop: 10,
  },
  previewCategoryHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6750A4',
    marginBottom: 5,
    marginTop: 10,
    textTransform: 'uppercase',
  },
});

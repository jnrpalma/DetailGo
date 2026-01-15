import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';

type Option<T extends string> = { label: string; value: T };

type Props<T extends string> = {
  title: string;
  visible: boolean;
  value: T | null;
  options: Option<T>[];
  onClose: () => void;
  onSelect: (v: T) => void;
};

export default function SelectModal<T extends string>({
  title,
  visible,
  value,
  options,
  onClose,
  onSelect,
}: Props<T>) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>

            <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.close}>Fechar</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={options}
            keyExtractor={(it) => it.value}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            contentContainerStyle={{ paddingBottom: 16 }}
            renderItem={({ item }) => {
              const selected = item.value === value;
              return (
                <TouchableOpacity
                  style={[styles.item, selected && styles.itemSelected]}
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                  }}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.itemText,
                      selected && styles.itemTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    maxHeight: '72%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: '900', color: '#111827' },
  close: { fontSize: 14, fontWeight: '900', color: '#0F766E' },

  item: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#FFF',
  },
  itemSelected: { backgroundColor: '#0F766E', borderColor: '#0F766E' },
  itemText: { color: '#111827', fontWeight: '800' },
  itemTextSelected: { color: '#FFF' },
});

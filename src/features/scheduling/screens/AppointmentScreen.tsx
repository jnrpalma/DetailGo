import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  View,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth } from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Car,
  Info,
  ChevronRight,
  X,
  Check,
  AlertCircle,
  Shield,
  Sparkles,
  Droplets,
  Wrench,
  Zap,
} from 'lucide-react-native';

import type { RootStackParamList } from '@app/types';
import {
  getAvailableSlotsForDay,
  createAppointmentWithCapacityCheck,
  type Slot,
} from '@features/scheduling/services/availability.service';
import type {
  VehicleType,
  CarCategory,
} from '@features/appointments/domain/appointment.types';
import { getBasePriceForAppointment } from '@features/appointments/domain/appointment.pricing';

const { width, height } = Dimensions.get('window');

const colors = {
  primary: '#0A4D68',
  primaryLight: '#E6F3F5',
  secondary: '#05BFDB',
  accent: '#FFB703',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  surfaceHover: '#F3F4F6',
  border: '#E5E7EB',
  borderFocus: '#0A4D68',
  text: {
    primary: '#111827',
    secondary: '#4B5563',
    tertiary: '#6B7280',
    disabled: '#9CA3AF',
    white: '#FFFFFF',
  },
  overlay: 'rgba(0,0,0,0.5)',
} as const;

const SERVICE_ICONS = {
  'Lavagem simples': Droplets,
  'Lavagem completa': Sparkles,
  Polimento: Zap,
  'Lavagem de motor': Wrench,
} as const;

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const CAR_CATEGORIES: CarCategory[] = [
  'Hatch',
  'Sedan',
  'SUV',
  'Picape cabine dupla',
];

const SERVICES = [
  {
    label: 'Lavagem simples',
    durationMin: 30,
    icon: Droplets,
    description: 'Limpeza rápida e essencial',
  },
  {
    label: 'Lavagem completa',
    durationMin: 60,
    icon: Sparkles,
    description: 'Limpeza detalhada completa',
  },
  {
    label: 'Polimento',
    durationMin: 120,
    icon: Zap,
    description: 'Recuperação de brilho da pintura',
  },
  {
    label: 'Lavagem de motor',
    durationMin: 45,
    icon: Wrench,
    description: 'Limpeza especializada do motor',
  },
] as const;

type ServiceLabel = (typeof SERVICES)[number]['label'];

const SERVICE_DETAILS: Record<
  ServiceLabel,
  {
    title: string;
    description: string;
    duration: string;
    includes: Array<{ text: string; icon: any }>;
    notIncluded?: Array<{ text: string; icon: any }>;
    note: string;
    recommendedFor: string[];
  }
> = {
  'Lavagem simples': {
    title: 'Lavagem Simples',
    description: 'Manutenção diária',
    duration: '30 min',
    includes: [
      { text: 'Lavagem externa', icon: Droplets },
      { text: 'Limpeza de vidros', icon: Sparkles },
      { text: 'Aspiração rápida', icon: Zap },
      { text: 'Acabamento nos pneus', icon: Check },
    ],
    notIncluded: [
      { text: 'Higienização profunda', icon: AlertCircle },
      { text: 'Remoção de manchas', icon: AlertCircle },
    ],
    note: 'Ideal para manutenção semanal.',
    recommendedFor: ['Uso diário', 'Manutenção'],
  },
  'Lavagem completa': {
    title: 'Lavagem Completa',
    description: 'Limpeza profunda',
    duration: '60 min',
    includes: [
      { text: 'Lavagem externa detalhada', icon: Droplets },
      { text: 'Limpeza de rodas', icon: Sparkles },
      { text: 'Aspiração completa', icon: Zap },
      { text: 'Acabamento premium', icon: Check },
      { text: 'Limpeza de soleiras', icon: Check },
    ],
    notIncluded: [
      { text: 'Polimento técnico', icon: AlertCircle },
      { text: 'Higienização com extração', icon: AlertCircle },
    ],
    note: 'Perfeito para ocasiões especiais.',
    recommendedFor: ['Eventos', 'Viagens', 'Showroom'],
  },
  Polimento: {
    title: 'Polimento Técnico',
    description: 'Recuperação de brilho',
    duration: '120 min',
    includes: [
      { text: 'Correção de swirls', icon: Zap },
      { text: 'Remoção de riscos leves', icon: Sparkles },
      { text: 'Proteção da pintura', icon: Shield },
      { text: 'Alta camada de brilho', icon: Check },
    ],
    notIncluded: [
      { text: 'Repintura', icon: AlertCircle },
      { text: 'Danos profundos', icon: AlertCircle },
    ],
    note: 'Recomendado a cada 6 meses.',
    recommendedFor: ['Carros +1 ano', 'Pré-venda'],
  },
  'Lavagem de motor': {
    title: 'Lavagem de Motor',
    description: 'Limpeza especializada',
    duration: '45 min',
    includes: [
      { text: 'Proteção elétrica', icon: Shield },
      { text: 'Desengraxante', icon: Droplets },
      { text: 'Secagem técnica', icon: Zap },
      { text: 'Acabamento', icon: Check },
    ],
    note: 'Cuidado especial com partes elétricas.',
    recommendedFor: ['Acúmulo de óleo', 'Prevenção'],
  },
};

const formatHour = (ms: number) => {
  return new Date(ms).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDayBR = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatCurrencyBRL = (v: number) => {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

function ServiceDetailsModal({
  visible,
  serviceLabel,
  price,
  onClose,
}: {
  visible: boolean;
  serviceLabel: ServiceLabel | null;
  price: number;
  onClose: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible || !serviceLabel) return null;

  const details = SERVICE_DETAILS[serviceLabel];
  const Icon = SERVICE_ICONS[serviceLabel];

  return (
    <Modal transparent visible={visible} onRequestClose={onClose}>
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.detailsModal,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.modalHandle} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            <View style={styles.detailsHeader}>
              <View style={styles.detailsIconContainer}>
                <Icon size={28} color={colors.primary} />
              </View>
              <View style={styles.detailsTitleContainer}>
                <Text style={styles.detailsTitle}>{details.title}</Text>
                <Text style={styles.detailsSubtitle}>
                  {details.description}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={18} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.priceDurationRow}>
              <View style={styles.priceBadge}>
                <Text style={styles.priceBadgeLabel}>Valor</Text>
                <Text style={styles.priceBadgeValue}>
                  {formatCurrencyBRL(price)}
                </Text>
              </View>
              <View style={styles.durationBadge}>
                <Clock size={14} color={colors.text.secondary} />
                <Text style={styles.durationBadgeText}>{details.duration}</Text>
              </View>
            </View>

            <View style={styles.detailsSection}>
              <View style={styles.sectionHeader}>
                <View
                  style={[
                    styles.sectionIcon,
                    { backgroundColor: colors.success + '20' },
                  ]}
                >
                  <Check size={14} color={colors.success} />
                </View>
                <Text style={styles.sectionHeaderTitle}>Inclui</Text>
              </View>
              <View style={styles.itemsGrid}>
                {details.includes.map((item, idx) => {
                  const ItemIcon = item.icon;
                  return (
                    <View key={`inc-${idx}`} style={styles.includedItem}>
                      <View
                        style={[
                          styles.itemIcon,
                          { backgroundColor: colors.success + '10' },
                        ]}
                      >
                        <ItemIcon size={12} color={colors.success} />
                      </View>
                      <Text style={styles.includedItemText}>{item.text}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {details.notIncluded && details.notIncluded.length > 0 && (
              <View style={styles.detailsSection}>
                <View style={styles.sectionHeader}>
                  <View
                    style={[
                      styles.sectionIcon,
                      { backgroundColor: colors.error + '20' },
                    ]}
                  >
                    <AlertCircle size={14} color={colors.error} />
                  </View>
                  <Text style={styles.sectionHeaderTitle}>Não inclui</Text>
                </View>
                <View style={styles.itemsGrid}>
                  {details.notIncluded.map((item, idx) => {
                    const ItemIcon = item.icon;
                    return (
                      <View key={`exc-${idx}`} style={styles.excludedItem}>
                        <View
                          style={[
                            styles.itemIcon,
                            { backgroundColor: colors.error + '10' },
                          ]}
                        >
                          <ItemIcon size={12} color={colors.error} />
                        </View>
                        <Text style={styles.excludedItemText}>{item.text}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {details.recommendedFor && (
              <View style={styles.detailsSection}>
                <View style={styles.sectionHeader}>
                  <View
                    style={[
                      styles.sectionIcon,
                      { backgroundColor: colors.primary + '20' },
                    ]}
                  >
                    <Sparkles size={14} color={colors.primary} />
                  </View>
                  <Text style={styles.sectionHeaderTitle}>Recomendado</Text>
                </View>
                <View style={styles.recommendedTags}>
                  {details.recommendedFor.map((item, idx) => (
                    <View key={`rec-${idx}`} style={styles.recommendedTag}>
                      <Text style={styles.recommendedTagText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.noteContainer}>
              <Info size={14} color={colors.text.tertiary} />
              <Text style={styles.noteText}>{details.note}</Text>
            </View>

            <TouchableOpacity
              style={styles.detailsActionButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.detailsActionButtonText}>Continuar</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function SelectModal<T extends string>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: readonly T[];
  selected: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalCard}>
          <View style={styles.modalCardHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={18} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map(opt => {
              const isSelected = opt === selected;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.modalItem,
                    isSelected && styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    onSelect(opt);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      isSelected && styles.modalItemTextSelected,
                    ]}
                  >
                    {opt}
                  </Text>
                  {isSelected && (
                    <View style={styles.modalItemCheck}>
                      <Check size={14} color={colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

export default function AppointmentScreen() {
  const auth = getAuth();
  const navigation = useNavigation<NavProp>();
  const uid = auth.currentUser?.uid;

  const [vehicleType, setVehicleType] = useState<VehicleType>('Carro');
  const [carCategory, setCarCategory] = useState<CarCategory | null>('Hatch');
  const [serviceLabel, setServiceLabel] = useState<ServiceLabel | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [serviceDetailsOpen, setServiceDetailsOpen] = useState(false);

  const [day, setDay] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedService = useMemo(
    () => SERVICES.find(s => s.label === serviceLabel) ?? null,
    [serviceLabel],
  );

  const basePrice = useMemo(() => {
    const price = getBasePriceForAppointment(
      vehicleType,
      vehicleType === 'Carro' ? carCategory : null,
    );
    return typeof price === 'number' ? price : 0;
  }, [vehicleType, carCategory]);

  const finalPrice = basePrice;

  const refreshSlots = useCallback(
    async (nextDay: Date, nextService = selectedService) => {
      if (!nextService) {
        setSlots([]);
        setSelectedSlot(null);
        return;
      }

      try {
        setLoadingSlots(true);
        const list = await getAvailableSlotsForDay(
          nextDay,
          nextService.durationMin,
        );
        setSlots(list);
        setSelectedSlot(null);
      } catch (error) {
        console.error(error);
        setSlots([]);
        setSelectedSlot(null);
        Alert.alert('Erro', 'Não foi possível carregar os horários.');
      } finally {
        setLoadingSlots(false);
      }
    },
    [selectedService],
  );

  const handleDayChange = async (
    event: DateTimePickerEvent,
    selected?: Date,
  ) => {
    if (Platform.OS === 'android' && event.type === 'dismissed') {
      setShowDayPicker(false);
      return;
    }
    setShowDayPicker(false);
    if (!selected) return;

    const next = new Date(selected);
    next.setHours(0, 0, 0, 0);
    setDay(next);
    await refreshSlots(next, selectedService);
  };

  const handleSelectService = async (service: ServiceLabel) => {
    setServiceLabel(service);
    const svc = SERVICES.find(s => s.label === service)!;
    await refreshSlots(day, svc);
  };

  const handleSave = async () => {
    if (!selectedService) {
      Alert.alert('Atenção', 'Selecione um serviço.');
      return;
    }

    if (vehicleType === 'Carro' && !carCategory) {
      Alert.alert('Atenção', 'Selecione a categoria do veículo.');
      return;
    }

    if (!selectedSlot) {
      Alert.alert('Atenção', 'Selecione um horário.');
      return;
    }

    try {
      setSubmitting(true);
      await createAppointmentWithCapacityCheck({
        customerUid: uid!,
        vehicleType,
        carCategory: vehicleType === 'Carro' ? carCategory : null,
        serviceLabel: selectedService.label,
        durationMin: selectedService.durationMin,
        price: finalPrice,
        startAtMs: selectedSlot.startAtMs,
        endAtMs: selectedSlot.endAtMs,
      });

      Alert.alert('Sucesso!', 'Seu agendamento foi confirmado.', [
        {
          text: 'Ver agendamentos',
          onPress: () => navigation.replace('Dashboard'),
        },
      ]);
    } catch (error: any) {
      if (error?.code === 'SLOT_FULL') {
        Alert.alert('Horário indisponível', 'Selecione outro horário.');
        await refreshSlots(day, selectedService);
      } else {
        console.error(error);
        Alert.alert('Erro', 'Não foi possível realizar o agendamento.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!uid) {
    return null;
  }

  const canConfirm = !!selectedService && !!selectedSlot && !submitting;
  const SelectedServiceIcon = selectedService ? selectedService.icon : Calendar;

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Header minimalista */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={18} color={colors.text.primary} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <View style={styles.headerIcon}>
              <Calendar size={16} color={colors.primary} />
            </View>
            <Text style={styles.headerTitle}>Agendar</Text>
          </View>

          <View style={styles.headerRight} />
        </View>

        <SelectModal
          visible={categoryModalOpen}
          title="Categoria"
          options={CAR_CATEGORIES}
          selected={carCategory}
          onSelect={value => setCarCategory(value)}
          onClose={() => setCategoryModalOpen(false)}
        />

        <SelectModal
          visible={serviceModalOpen}
          title="Serviço"
          options={SERVICES.map(s => s.label)}
          selected={serviceLabel}
          onSelect={handleSelectService}
          onClose={() => setServiceModalOpen(false)}
        />

        <ServiceDetailsModal
          visible={serviceDetailsOpen}
          serviceLabel={serviceLabel}
          price={finalPrice}
          onClose={() => setServiceDetailsOpen(false)}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Data */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DATA</Text>
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => setShowDayPicker(true)}
            >
              <View style={styles.dateSelectorContent}>
                <Calendar size={18} color={colors.primary} />
                <Text style={styles.dateSelectorText}>{formatDayBR(day)}</Text>
              </View>
              <ChevronRight size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          {showDayPicker && (
            <DateTimePicker
              value={day}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={handleDayChange}
              minimumDate={new Date()}
            />
          )}

          {/* Veículo - CARDS SUPER COMPACTOS */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>VEÍCULO</Text>
            <View style={styles.vehicleGrid}>
              <TouchableOpacity
                style={[
                  styles.vehicleCard,
                  vehicleType === 'Carro' && styles.vehicleCardSelected,
                ]}
                onPress={() => {
                  setVehicleType('Carro');
                  if (!carCategory) setCarCategory('Hatch');
                }}
              >
                <Car
                  size={16}
                  color={
                    vehicleType === 'Carro'
                      ? colors.primary
                      : colors.text.tertiary
                  }
                />
                <Text
                  style={[
                    styles.vehicleLabel,
                    vehicleType === 'Carro' && styles.vehicleLabelSelected,
                  ]}
                >
                  Carro
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.vehicleCard,
                  vehicleType === 'Moto' && styles.vehicleCardSelected,
                ]}
                onPress={() => {
                  setVehicleType('Moto');
                  setCarCategory(null);
                }}
              >
                <Car
                  size={16}
                  color={
                    vehicleType === 'Moto'
                      ? colors.primary
                      : colors.text.tertiary
                  }
                />
                <Text
                  style={[
                    styles.vehicleLabel,
                    vehicleType === 'Moto' && styles.vehicleLabelSelected,
                  ]}
                >
                  Moto
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Categoria */}
          {vehicleType === 'Carro' && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>CATEGORIA</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setCategoryModalOpen(true)}
              >
                <View style={styles.selectorContent}>
                  <Car size={16} color={colors.text.secondary} />
                  <Text
                    style={[
                      styles.selectorText,
                      !carCategory && styles.selectorPlaceholder,
                    ]}
                  >
                    {carCategory ?? 'Selecione'}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Serviço */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SERVIÇO</Text>

            {serviceLabel ? (
              <TouchableOpacity
                style={styles.serviceCard}
                onPress={() => setServiceModalOpen(true)}
              >
                <View style={styles.serviceCardLeft}>
                  <View style={styles.serviceIconContainer}>
                    <SelectedServiceIcon size={18} color={colors.primary} />
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{serviceLabel}</Text>
                    <Text style={styles.serviceDuration}>
                      {selectedService?.durationMin}min •{' '}
                      {formatCurrencyBRL(finalPrice)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.detailsBadge}
                  onPress={() => setServiceDetailsOpen(true)}
                >
                  <Info size={11} color={colors.primary} />
                  <Text style={styles.detailsBadgeText}>Detalhes</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setServiceModalOpen(true)}
              >
                <View style={styles.selectorContent}>
                  <Clock size={16} color={colors.text.secondary} />
                  <Text style={styles.selectorPlaceholder}>
                    Selecione um serviço
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Horários */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>HORÁRIOS</Text>
              {selectedService && slots.length > 0 && (
                <View style={styles.slotCountBadge}>
                  <Text style={styles.slotCountText}>{slots.length}</Text>
                </View>
              )}
            </View>

            {!selectedService ? (
              <View style={styles.emptyState}>
                <Clock size={20} color={colors.text.disabled} />
                <Text style={styles.emptyStateTitle}>Selecione um serviço</Text>
              </View>
            ) : loadingSlots ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Carregando...</Text>
              </View>
            ) : slots.length === 0 ? (
              <View style={styles.emptyState}>
                <Calendar size={20} color={colors.text.disabled} />
                <Text style={styles.emptyStateTitle}>Nenhum horário</Text>
              </View>
            ) : (
              <FlatList
                horizontal
                data={slots}
                keyExtractor={item => String(item.startAtMs)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.slotsList}
                renderItem={({ item }) => {
                  const isSelected = selectedSlot?.startAtMs === item.startAtMs;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.slotCard,
                        isSelected && styles.slotCardSelected,
                      ]}
                      onPress={() => setSelectedSlot(item)}
                    >
                      <Text
                        style={[
                          styles.slotTime,
                          isSelected && styles.slotTimeSelected,
                        ]}
                      >
                        {formatHour(item.startAtMs)}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>

          {/* Total - Compacto */}
          {canConfirm && (
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatCurrencyBRL(finalPrice)}
              </Text>
            </View>
          )}

          {/* Botão confirmar */}
          <TouchableOpacity
            style={[
              styles.confirmButton,
              !canConfirm && styles.confirmButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!canConfirm || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.text.white} />
            ) : (
              <Text style={styles.confirmButtonText}>
                {canConfirm ? 'Confirmar agendamento' : 'Selecione os dados'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerRight: {
    width: 36,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.tertiary,
    marginBottom: 6,
    letterSpacing: 0.8,
  },

  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  dateSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateSelectorText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },

  vehicleGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  vehicleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  vehicleCardSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  vehicleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  vehicleLabelSelected: {
    color: colors.primary,
  },

  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectorText: {
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '500',
  },
  selectorPlaceholder: {
    fontSize: 15,
    color: colors.text.disabled,
  },

  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  serviceCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  serviceIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  serviceDuration: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
  detailsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
  },
  detailsBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },

  slotsList: {
    gap: 8,
    paddingVertical: 4,
  },
  slotCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  slotTime: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  slotTimeSelected: {
    color: colors.text.white,
  },
  slotCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
  },
  slotCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },

  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateTitle: {
    fontSize: 14,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.secondary,
  },

  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },

  confirmButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.text.disabled,
    shadowOpacity: 0,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.white,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    maxHeight: '70%',
  },
  modalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 2,
    borderRadius: 10,
  },
  modalItemSelected: {
    backgroundColor: colors.primaryLight,
  },
  modalItemText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  modalItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  modalItemCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  detailsModal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 16,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalScrollContent: {
    paddingBottom: 24,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailsIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailsTitleContainer: {
    flex: 1,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  detailsSubtitle: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  priceBadge: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 14,
  },
  priceBadgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceBadgeValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  durationBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  detailsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  sectionIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  includedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '48%',
  },
  excludedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '48%',
  },
  itemIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  includedItemText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.primary,
    fontWeight: '500',
  },
  excludedItemText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.tertiary,
  },
  recommendedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  recommendedTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recommendedTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.tertiary,
    lineHeight: 18,
  },
  detailsActionButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  detailsActionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.white,
  },
});

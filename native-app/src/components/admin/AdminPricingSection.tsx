import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  BannerAnnouncement,
  BillingPlan,
  SchoolData,
  SchoolDiscount,
} from '../../types/app';

interface AdminPricingSectionProps {
  schools: SchoolData[];
  plans: BillingPlan[];
  discounts: SchoolDiscount[];
  announcements: BannerAnnouncement[];
  onCreateSchool: (input: {
    name: string;
    location: string;
    principal?: string | null;
    phone?: string | null;
    email?: string | null;
    assignedPlanCode: 'weekly' | 'monthly' | 'annual';
    discountId?: string | null;
  }) => Promise<unknown>;
  onUpdateSchool: (
    schoolId: string,
    input: {
      name: string;
      location: string;
      principal?: string | null;
      phone?: string | null;
      email?: string | null;
      assignedPlanCode: 'weekly' | 'monthly' | 'annual';
      discountId?: string | null;
    },
  ) => Promise<unknown>;
  onDeleteSchool: (schoolId: string) => Promise<unknown>;
  onCreateDiscount: (input: {
    name: string;
    type: 'percentage' | 'fixed_ksh';
    amount: number;
    isActive: boolean;
  }) => Promise<unknown>;
  onUpdateDiscount: (
    discountId: string,
    input: {
      name: string;
      type: 'percentage' | 'fixed_ksh';
      amount: number;
      isActive: boolean;
    },
  ) => Promise<unknown>;
  onDeleteDiscount: (discountId: string) => Promise<unknown>;
  onCreateAnnouncement: (input: {
    title: string;
    message: string;
    ctaLabel?: string | null;
    ctaTarget: BannerAnnouncement['ctaTarget'];
    startsAt?: string;
    endsAt?: string | null;
    isActive: boolean;
  }) => Promise<unknown>;
  onUpdateAnnouncement: (
    announcementId: string,
    input: {
      title: string;
      message: string;
      ctaLabel?: string | null;
      ctaTarget: BannerAnnouncement['ctaTarget'];
      startsAt?: string;
      endsAt?: string | null;
      isActive: boolean;
    },
  ) => Promise<unknown>;
  onDeleteAnnouncement: (announcementId: string) => Promise<unknown>;
}

const planOptions: Array<'weekly' | 'monthly' | 'annual'> = ['weekly', 'monthly', 'annual'];
const ctaTargets: BannerAnnouncement['ctaTarget'][] = [
  'ask_tutor',
  'manage_subscription',
  'homework_list',
  'bookshelf_view',
];

function emptySchoolDraft(): {
  name: string;
  location: string;
  principal: string;
  phone: string;
  email: string;
  assignedPlanCode: 'weekly' | 'monthly' | 'annual';
  discountId: string;
} {
  return {
    name: '',
    location: '',
    principal: '',
    phone: '',
    email: '',
    assignedPlanCode: 'monthly' as const,
    discountId: '',
  };
}

type SchoolDraft = ReturnType<typeof emptySchoolDraft>;

interface DiscountDraft {
  name: string;
  type: 'percentage' | 'fixed_ksh';
  amount: string;
  isActive: boolean;
}

interface AnnouncementDraft {
  title: string;
  message: string;
  ctaLabel: string;
  ctaTarget: BannerAnnouncement['ctaTarget'];
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

export function AdminPricingSection({
  schools,
  plans,
  discounts,
  announcements,
  onCreateSchool,
  onUpdateSchool,
  onDeleteSchool,
  onCreateDiscount,
  onUpdateDiscount,
  onDeleteDiscount,
  onCreateAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
}: AdminPricingSectionProps) {
  const [schoolDraft, setSchoolDraft] = useState<SchoolDraft>(emptySchoolDraft());
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [discountDraft, setDiscountDraft] = useState<DiscountDraft>({
    name: '',
    type: 'percentage' as const,
    amount: '10',
    isActive: true,
  });
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
  const [announcementDraft, setAnnouncementDraft] = useState<AnnouncementDraft>({
    title: '',
    message: '',
    ctaLabel: '',
    ctaTarget: 'ask_tutor' as BannerAnnouncement['ctaTarget'],
    startsAt: '',
    endsAt: '',
    isActive: true,
  });
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);

  const schoolPlans = useMemo(
    () => plans.filter(plan => planOptions.includes(plan.code as 'weekly' | 'monthly' | 'annual')),
    [plans],
  );

  useEffect(() => {
    if (editingSchoolId) {
      const school = schools.find(item => item.id === editingSchoolId);
      if (school) {
        setSchoolDraft({
          name: school.name,
          location: school.location,
          principal: school.principal || '',
          phone: school.phone || '',
          email: school.email || '',
          assignedPlanCode: (school.pricing?.assignedPlanCode || 'monthly') as 'weekly' | 'monthly' | 'annual',
          discountId: school.pricing?.discount?.id || '',
        });
      }
    }
  }, [editingSchoolId, schools]);

  async function saveSchool() {
    const payload = {
      name: schoolDraft.name.trim(),
      location: schoolDraft.location.trim(),
      principal: schoolDraft.principal.trim() || null,
      phone: schoolDraft.phone.trim() || null,
      email: schoolDraft.email.trim() || null,
      assignedPlanCode: schoolDraft.assignedPlanCode,
      discountId: schoolDraft.discountId || null,
    };

    if (!payload.name || !payload.location) {
      return;
    }

    if (editingSchoolId) {
      await onUpdateSchool(editingSchoolId, payload);
    } else {
      await onCreateSchool(payload);
    }
    setEditingSchoolId(null);
    setSchoolDraft(emptySchoolDraft());
  }

  async function saveDiscount() {
    const payload = {
      name: discountDraft.name.trim(),
      type: discountDraft.type,
      amount: Number(discountDraft.amount || 0),
      isActive: discountDraft.isActive,
    };
    if (!payload.name || payload.amount <= 0) {
      return;
    }

    if (editingDiscountId) {
      await onUpdateDiscount(editingDiscountId, payload);
    } else {
      await onCreateDiscount(payload);
    }

    setEditingDiscountId(null);
    setDiscountDraft({
      name: '',
      type: 'percentage',
      amount: '10',
      isActive: true,
    });
  }

  async function saveAnnouncement() {
    const payload = {
      title: announcementDraft.title.trim(),
      message: announcementDraft.message.trim(),
      ctaLabel: announcementDraft.ctaLabel.trim() || null,
      ctaTarget: announcementDraft.ctaTarget,
      startsAt: announcementDraft.startsAt.trim() || undefined,
      endsAt: announcementDraft.endsAt.trim() || null,
      isActive: announcementDraft.isActive,
    };
    if (!payload.title || !payload.message) {
      return;
    }

    if (editingAnnouncementId) {
      await onUpdateAnnouncement(editingAnnouncementId, payload);
    } else {
      await onCreateAnnouncement(payload);
    }

    setEditingAnnouncementId(null);
    setAnnouncementDraft({
      title: '',
      message: '',
      ctaLabel: '',
      ctaTarget: 'ask_tutor',
      startsAt: '',
      endsAt: '',
      isActive: true,
    });
  }

  return (
    <View style={styles.root}>
      <View style={styles.panel}>
        <Text style={styles.title}>Pricing & Discounts</Text>
        <Text style={styles.subtitle}>
          Link each school to one package, optionally apply a reusable discount, and manage banner announcements.
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>School pricing</Text>
        {schools.map(school => (
          <Pressable key={school.id} onPress={() => setEditingSchoolId(school.id)} style={styles.item}>
            <View>
              <Text style={styles.itemTitle}>{school.name}</Text>
              <Text style={styles.itemMeta}>
                {school.pricing?.assignedPlanName || 'No package'} • KSh {school.pricing?.effectivePriceKsh ?? '--'}
              </Text>
            </View>
            <Text style={styles.itemEdit}>Edit</Text>
          </Pressable>
        ))}

        <Text style={styles.fieldLabel}>{editingSchoolId ? 'Edit school' : 'Add school'}</Text>
        <TextInput value={schoolDraft.name} onChangeText={value => setSchoolDraft(current => ({ ...current, name: value }))} placeholder="School name" placeholderTextColor="#94A3B8" style={styles.input} />
        <TextInput value={schoolDraft.location} onChangeText={value => setSchoolDraft(current => ({ ...current, location: value }))} placeholder="Location" placeholderTextColor="#94A3B8" style={styles.input} />
        <TextInput value={schoolDraft.principal} onChangeText={value => setSchoolDraft(current => ({ ...current, principal: value }))} placeholder="Principal" placeholderTextColor="#94A3B8" style={styles.input} />
        <TextInput value={schoolDraft.phone} onChangeText={value => setSchoolDraft(current => ({ ...current, phone: value }))} placeholder="Phone" placeholderTextColor="#94A3B8" style={styles.input} />
        <TextInput value={schoolDraft.email} onChangeText={value => setSchoolDraft(current => ({ ...current, email: value }))} placeholder="Email" placeholderTextColor="#94A3B8" style={styles.input} />
        <View style={styles.choiceRow}>
          {schoolPlans.map(plan => (
            <Pressable
              key={plan.code}
              onPress={() =>
                setSchoolDraft(current => ({
                  ...current,
                  assignedPlanCode: plan.code as 'weekly' | 'monthly' | 'annual',
                }))
              }
              style={[
                styles.choiceChip,
                schoolDraft.assignedPlanCode === plan.code && styles.choiceChipActive,
              ]}>
              <Text style={styles.choiceText}>{plan.name}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.choiceRow}>
          <Pressable
            onPress={() => setSchoolDraft(current => ({ ...current, discountId: '' }))}
            style={[styles.choiceChip, !schoolDraft.discountId && styles.choiceChipActive]}>
            <Text style={styles.choiceText}>No discount</Text>
          </Pressable>
          {discounts.map(discount => (
            <Pressable
              key={discount.id}
              onPress={() => setSchoolDraft(current => ({ ...current, discountId: discount.id }))}
              style={[
                styles.choiceChip,
                schoolDraft.discountId === discount.id && styles.choiceChipActive,
              ]}>
              <Text style={styles.choiceText}>{discount.name}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.actionRow}>
          <Pressable onPress={saveSchool} style={styles.primaryButton}>
            <Text style={styles.primaryText}>{editingSchoolId ? 'Save school' : 'Create school'}</Text>
          </Pressable>
          {editingSchoolId ? (
            <Pressable
              onPress={async () => {
                await onDeleteSchool(editingSchoolId);
                setEditingSchoolId(null);
                setSchoolDraft(emptySchoolDraft());
              }}
              style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Delete</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Reusable discounts</Text>
        {discounts.map(discount => (
          <Pressable
            key={discount.id}
            onPress={() => {
              setEditingDiscountId(discount.id);
              setDiscountDraft({
                name: discount.name,
                type: discount.type,
                amount: String(discount.amount),
                isActive: discount.isActive,
              });
            }}
            style={styles.item}>
            <View>
              <Text style={styles.itemTitle}>{discount.name}</Text>
              <Text style={styles.itemMeta}>
                {discount.type === 'percentage' ? `${discount.amount}% off` : `KSh ${discount.amount} off`}
              </Text>
            </View>
            <Text style={styles.itemEdit}>Edit</Text>
          </Pressable>
        ))}

        <TextInput value={discountDraft.name} onChangeText={value => setDiscountDraft(current => ({ ...current, name: value }))} placeholder="Discount name" placeholderTextColor="#94A3B8" style={styles.input} />
        <View style={styles.choiceRow}>
          {(['percentage', 'fixed_ksh'] as const).map(type => (
            <Pressable
              key={type}
              onPress={() => setDiscountDraft(current => ({ ...current, type }))}
              style={[styles.choiceChip, discountDraft.type === type && styles.choiceChipActive]}>
              <Text style={styles.choiceText}>{type === 'percentage' ? '% Off' : 'KSh Off'}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={discountDraft.amount}
          onChangeText={value => setDiscountDraft(current => ({ ...current, amount: value }))}
          keyboardType="number-pad"
          placeholder="Amount"
          placeholderTextColor="#94A3B8"
          style={styles.input}
        />
        <View style={styles.choiceRow}>
          {[
            { label: 'Active', value: true },
            { label: 'Paused', value: false },
          ].map(option => (
            <Pressable
              key={option.label}
              onPress={() => setDiscountDraft(current => ({ ...current, isActive: option.value }))}
              style={[styles.choiceChip, discountDraft.isActive === option.value && styles.choiceChipActive]}>
              <Text style={styles.choiceText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.actionRow}>
          <Pressable onPress={saveDiscount} style={styles.primaryButton}>
            <Text style={styles.primaryText}>{editingDiscountId ? 'Save discount' : 'Create discount'}</Text>
          </Pressable>
          {editingDiscountId ? (
            <Pressable
              onPress={async () => {
                await onDeleteDiscount(editingDiscountId);
                setEditingDiscountId(null);
                setDiscountDraft({ name: '', type: 'percentage', amount: '10', isActive: true });
              }}
              style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Delete</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Hero announcements</Text>
        {announcements.map(announcement => (
          <Pressable
            key={announcement.id}
            onPress={() => {
              setEditingAnnouncementId(announcement.id);
              setAnnouncementDraft({
                title: announcement.title,
                message: announcement.message,
                ctaLabel: announcement.ctaLabel || '',
                ctaTarget: announcement.ctaTarget,
                startsAt: announcement.startsAt || '',
                endsAt: announcement.endsAt || '',
                isActive: announcement.isActive,
              });
            }}
            style={styles.item}>
            <View style={styles.flex}>
              <Text style={styles.itemTitle}>{announcement.title}</Text>
              <Text style={styles.itemMeta}>{announcement.message}</Text>
            </View>
            <Text style={styles.itemEdit}>Edit</Text>
          </Pressable>
        ))}

        <TextInput value={announcementDraft.title} onChangeText={value => setAnnouncementDraft(current => ({ ...current, title: value }))} placeholder="Announcement title" placeholderTextColor="#94A3B8" style={styles.input} />
        <TextInput value={announcementDraft.message} onChangeText={value => setAnnouncementDraft(current => ({ ...current, message: value }))} placeholder="Announcement message" placeholderTextColor="#94A3B8" multiline style={[styles.input, styles.messageInput]} />
        <TextInput value={announcementDraft.ctaLabel} onChangeText={value => setAnnouncementDraft(current => ({ ...current, ctaLabel: value }))} placeholder="CTA label" placeholderTextColor="#94A3B8" style={styles.input} />
        <View style={styles.choiceRow}>
          {ctaTargets.map(target => (
            <Pressable
              key={target}
              onPress={() => setAnnouncementDraft(current => ({ ...current, ctaTarget: target }))}
              style={[styles.choiceChip, announcementDraft.ctaTarget === target && styles.choiceChipActive]}>
              <Text style={styles.choiceText}>{target}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput value={announcementDraft.startsAt} onChangeText={value => setAnnouncementDraft(current => ({ ...current, startsAt: value }))} placeholder="Starts at ISO (optional)" placeholderTextColor="#94A3B8" style={styles.input} />
        <TextInput value={announcementDraft.endsAt} onChangeText={value => setAnnouncementDraft(current => ({ ...current, endsAt: value }))} placeholder="Ends at ISO (optional)" placeholderTextColor="#94A3B8" style={styles.input} />
        <View style={styles.choiceRow}>
          {[
            { label: 'Active', value: true },
            { label: 'Inactive', value: false },
          ].map(option => (
            <Pressable
              key={option.label}
              onPress={() => setAnnouncementDraft(current => ({ ...current, isActive: option.value }))}
              style={[styles.choiceChip, announcementDraft.isActive === option.value && styles.choiceChipActive]}>
              <Text style={styles.choiceText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.actionRow}>
          <Pressable onPress={saveAnnouncement} style={styles.primaryButton}>
            <Text style={styles.primaryText}>{editingAnnouncementId ? 'Save announcement' : 'Create announcement'}</Text>
          </Pressable>
          {editingAnnouncementId ? (
            <Pressable
              onPress={async () => {
                await onDeleteAnnouncement(editingAnnouncementId);
                setEditingAnnouncementId(null);
                setAnnouncementDraft({
                  title: '',
                  message: '',
                  ctaLabel: '',
                  ctaTarget: 'ask_tutor',
                  startsAt: '',
                  endsAt: '',
                  isActive: true,
                });
              }}
              style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Delete</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 16,
  },
  panel: {
    backgroundColor: '#FFF',
    borderColor: '#E6EEF8',
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 1,
  },
  title: {
    color: '#0F172A',
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  item: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#DDE7F3',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  itemTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  itemMeta: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  itemEdit: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '800',
  },
  fieldLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderColor: '#DDE7F3',
    borderRadius: 14,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageInput: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    backgroundColor: '#FFF',
    borderColor: '#DDE7F3',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  choiceChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  choiceText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 92,
    paddingHorizontal: 16,
  },
  secondaryText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800',
  },
  flex: {
    flex: 1,
  },
});

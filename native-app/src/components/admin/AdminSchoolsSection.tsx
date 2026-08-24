import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Building2, ChevronDown, MapPin, Plus } from 'lucide-react-native';

import { SchoolData } from '../../types/app';
import { getAdminSchools } from '../../services/appDataService';

interface AdminSchoolsSectionProps {
  styles: Record<string, any>;
  schoolSort: string;
  schoolSortOpen: boolean;
  schoolsList: SchoolData[];
  onToggleSortMenu: () => void;
  onSelectSort: (value: string) => void;
  onAddSchool: () => void;
  onSelectSchool: (school: SchoolData) => void;
}

export function AdminSchoolsSection({
  styles,
  schoolSort,
  schoolSortOpen,
  schoolsList: _schoolsList,
  onToggleSortMenu,
  onSelectSort,
  onAddSchool,
  onSelectSchool,
}: AdminSchoolsSectionProps) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [remoteSchools, setRemoteSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalSchools, setTotalSchools] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setLoadError(false);
      getAdminSchools({ query, limit: pageSize, offset: page * pageSize })
        .then(result => {
          setRemoteSchools(result.schools);
          setTotalSchools(result.total);
          setHasNextPage(result.hasNext);
        })
        .catch(() => { setRemoteSchools([]); setHasNextPage(false); setLoadError(true); })
        .finally(() => setLoading(false));
    }, 220);
    return () => clearTimeout(timer);
  }, [page, query, reloadToken]);

  const visibleSchools = remoteSchools;
  const mostActiveSchool =
    visibleSchools.length > 0
      ? [...visibleSchools].sort((left, right) => right.totalStudents - left.totalStudents)[0]
      : null;

  return (
    <>
      <View style={styles.pageHeadRow}>
        <View style={styles.pageHead}>
          <Text style={styles.pageTitle}>Schools</Text>
          <Text style={styles.pageSub}>Manage partner schools.</Text>
        </View>
        <View style={styles.menuWrap}>
          <Pressable onPress={onToggleSortMenu} style={styles.chip}>
            <Text style={styles.chipText}>{schoolSort}</Text>
            <ChevronDown size={14} color="#94A3B8" />
          </Pressable>
          {schoolSortOpen ? (
            <View style={styles.menu}>
              {['All Grades (Sort)', 'Most Students', 'Least Students', 'A-Z'].map(option => (
                <Pressable
                  key={option}
                  onPress={() => onSelectSort(option)}
                  style={[styles.menuItem, schoolSort === option && styles.menuItemActive]}>
                  <Text style={[styles.menuText, schoolSort === option && styles.menuTextActive]}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.cardsRow}>
        <View style={[styles.heroCard, styles.blue]}>
          <Text style={styles.heroLabel}>Total Schools</Text>
          <Text style={styles.heroValue}>{totalSchools}</Text>
        </View>
        <View style={[styles.heroCard, styles.green]}>
          <Text style={styles.heroLabel}>Largest on this page</Text>
          <Text style={styles.panelTitleLight}>
            {mostActiveSchool ? mostActiveSchool.name : 'No school data yet'}
          </Text>
        </View>
      </View>

      <Pressable onPress={onAddSchool} style={styles.addSchool}>
        <Plus size={18} color="#9CA3AF" />
        <Text style={styles.addSchoolText}>Register New School</Text>
      </Pressable>

      <View style={styles.searchWrap}>
        <TextInput
          accessibilityLabel="Search schools"
          value={query}
          onChangeText={value => { setQuery(value); setPage(0); }}
          placeholder="Search all schools by name..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
      </View>
      {loading ? <ActivityIndicator accessibilityLabel="Loading schools" /> : null}
      {loadError ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Could not load schools.</Text>
          <Pressable onPress={() => setReloadToken(value => value + 1)} style={styles.chip}><Text style={styles.chipText}>Retry</Text></Pressable>
        </View>
      ) : null}

      <View style={styles.list}>
        {!loadError && visibleSchools.length > 0 ? (
          visibleSchools.map(school => (
            <Pressable key={school.id} onPress={() => onSelectSchool(school)} style={styles.listItem}>
              <View style={styles.row}>
                <View style={styles.schoolIcon}>
                  <Building2 size={22} color="#4F46E5" />
                </View>
                <View>
                  <Text style={styles.itemTitle}>{school.name}</Text>
                  <View style={styles.rowTinyWrap}>
                    <MapPin size={12} color="#9CA3AF" />
                    <Text style={styles.itemMeta}>{school.location}</Text>
                  </View>
                </View>
              </View>
              <View>
                <Text style={styles.itemTitle}>{school.totalStudents}</Text>
                <Text style={styles.itemMeta}>Students</Text>
              </View>
            </Pressable>
          ))
        ) : !loadError ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No schools registered yet.</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.row}>
        <Pressable disabled={page === 0 || loading} onPress={() => setPage(value => Math.max(0, value - 1))} style={styles.chip}>
          <Text style={styles.chipText}>Previous</Text>
        </Pressable>
        <Text style={styles.itemMeta}>{`Page ${page + 1}`}</Text>
        <Pressable disabled={!hasNextPage || loading} onPress={() => setPage(value => value + 1)} style={styles.chip}>
          <Text style={styles.chipText}>Next</Text>
        </Pressable>
      </View>
    </>
  );
}

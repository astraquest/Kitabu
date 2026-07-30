import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Box, Shapes, X } from 'lucide-react-native';

import { getLearningAssets, getLearningAssetViewerUrl, type LearningAssetCatalog, type LearningAssetSummary } from '../../services/learningAssetService';
import { LearningAssetPreview } from './LearningAssetPreview';

const EMPTY_CATALOG: LearningAssetCatalog = { assets: [], totalReady: 0, totalRegistered: 0, collections: [] };

export function AdminLearningAssetsPanel() {
  const [catalog, setCatalog] = useState<LearningAssetCatalog>(EMPTY_CATALOG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<LearningAssetSummary | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    let active = true;
    const load = () => getLearningAssets()
      .then(result => {
        if (active) {
          setCatalog(result);
          setError(null);
        }
      })
      .catch(loadError => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load assets.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    load();
    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  if (loading) {
    return (
      <View style={s.statePanel} accessibilityLabel="Loading learning assets">
        <ActivityIndicator size="small" color="#2563EB" />
        <Text style={s.body}>Loading assets...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.statePanel}>
        <Box size={28} color="#94A3B8" />
        <Text style={s.title}>Assets unavailable</Text>
        <Text style={s.meta}>{error}</Text>
      </View>
    );
  }

  const categories = Array.from(new Set(catalog.assets.map(asset => asset.category).filter((category): category is string => Boolean(category))));
  const displayedAssets = selectedCategory === 'all'
    ? catalog.assets
    : catalog.assets.filter(asset => asset.category === selectedCategory);
  const vectorPilot = catalog.collections.find(collection => collection.id === 'kitabu.pp2-vector-pilot');

  return (
    <View style={s.section}>
      <View style={s.summaryRow}>
        <View>
          <Text style={s.title}>Learning Assets</Text>
          <Text style={s.meta}>{catalog.totalReady} ready · {catalog.totalRegistered} registered</Text>
        </View>
        <View style={s.countBadge}><Text style={s.countText}>{catalog.totalReady}</Text></View>
      </View>

      {vectorPilot ? (
        <View accessibilityLabel="PP2 vector pilot progress" style={s.progressCard}>
          <View style={s.progressCopy}>
            <Text style={s.itemTitle}>{vectorPilot.label}</Text>
            <Text style={s.meta}>{vectorPilot.ready} ready of {vectorPilot.target} target assets</Text>
          </View>
          <Text style={s.progressValue}>{Math.min(100, Math.round((vectorPilot.ready / Math.max(1, vectorPilot.target)) * 100))}%</Text>
        </View>
      ) : null}

      {categories.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoryRow}>
          {['all', ...categories].map(category => (
            <Pressable
              accessibilityLabel={`Show ${category === 'all' ? 'all' : category} assets`}
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[s.categoryChip, selectedCategory === category && s.categoryChipActive]}
            >
              <Text style={[s.categoryText, selectedCategory === category && s.categoryTextActive]}>{category === 'all' ? 'All' : category}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {displayedAssets.length === 0 ? (
        <View style={s.statePanel}>
          <View style={s.iconWrap}><Box size={26} color="#2563EB" /></View>
          <Text style={s.title}>No learning assets registered</Text>
          <Text style={s.meta}>Generated assets will appear here.</Text>
        </View>
      ) : (
        <View style={s.list}>
          {displayedAssets.map(asset => {
            const statusLabel = asset.status === 'prototype-conditional' ? 'Conditional' : asset.status[0].toUpperCase() + asset.status.slice(1);
            const isReady = asset.status === 'ready';
            return <Pressable
              accessibilityLabel={`Preview ${asset.displayName}`}
              accessibilityRole="button"
              key={`${asset.assetId}@${asset.version}`}
              onPress={() => setSelectedAsset(asset)}
              style={({ pressed }) => [s.card, pressed && s.cardPressed]}>
              <View style={s.iconWrap}>{asset.kind === 'vector' ? <Shapes size={24} color="#7C3AED" /> : <Box size={24} color="#2563EB" />}</View>
              <View style={s.cardBody}>
                <Text style={s.itemTitle}>{asset.displayName}</Text>
                <Text numberOfLines={1} style={s.meta}>{asset.category ? `${asset.category} · ` : ''}{asset.assetId}</Text>
                {asset.uses?.length ? <Text numberOfLines={1} style={s.uses}>{asset.uses.join(' · ')}</Text> : null}
              </View>
              <View style={[s.statusBadge, isReady ? s.readyBadge : s.draftBadge]}>
                <Text style={[s.statusBadgeText, isReady ? s.readyBadgeText : s.draftBadgeText]}>{statusLabel}</Text>
              </View>
            </Pressable>;
          })}
        </View>
      )}

      <Modal visible={selectedAsset !== null} animationType="slide" onRequestClose={() => setSelectedAsset(null)}>
        {selectedAsset ? (
          <View style={s.previewRoot}>
            <View style={s.previewHeader}>
              <View style={s.previewHeaderText}>
                <Text style={s.previewEyebrow}>{selectedAsset.kind === 'vector' ? 'SVG VECTOR PREVIEW' : 'IMG2THREEJS PREVIEW'}</Text>
                <Text numberOfLines={1} style={s.previewTitle}>{selectedAsset.displayName}</Text>
              </View>
              <Pressable accessibilityLabel="Close asset preview" onPress={() => setSelectedAsset(null)} style={s.closeButton}>
                <X size={20} color="#334155" />
              </Pressable>
            </View>
            <LearningAssetPreview title={`${selectedAsset.displayName} preview`} uri={getLearningAssetViewerUrl(selectedAsset)} />
            <View style={s.previewFooter}>
              <View style={s.previewFooterBody}>
                <Text numberOfLines={1} style={s.itemTitle}>{selectedAsset.assetId}</Text>
                <Text style={s.meta}>Version {selectedAsset.version} · {selectedAsset.kind === 'vector' ? 'Reusable SVG' : 'Interactive preview'}</Text>
              </View>
              <View style={[s.statusBadge, selectedAsset.status === 'ready' ? s.readyBadge : s.draftBadge]}>
                <Text style={[s.statusBadgeText, selectedAsset.status === 'ready' ? s.readyBadgeText : s.draftBadgeText]}>
                  {selectedAsset.status === 'prototype-conditional' ? 'Conditional' : selectedAsset.status}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  section: { gap: 14 },
  summaryRow: { backgroundColor: '#FFF', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: '#E6EEF8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#0F172A', fontSize: 18, fontWeight: '900' },
  body: { color: '#475569', lineHeight: 21 },
  meta: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  countBadge: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  countText: { color: '#2563EB', fontSize: 18, fontWeight: '900' },
  progressCard: { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, justifyContent: 'space-between', padding: 14 },
  progressCopy: { flex: 1 },
  progressValue: { color: '#6D28D9', fontSize: 18, fontWeight: '900' },
  categoryRow: { gap: 8, paddingRight: 10 },
  categoryChip: { backgroundColor: '#F1F5F9', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  categoryChipActive: { backgroundColor: '#312E81' },
  categoryText: { color: '#475569', fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  categoryTextActive: { color: '#FFFFFF' },
  statePanel: { minHeight: 180, backgroundColor: '#FFF', borderRadius: 24, borderWidth: 1, borderColor: '#E6EEF8', padding: 24, gap: 10, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  list: { gap: 10 },
  card: { minHeight: 82, backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#E6EEF8', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardPressed: { opacity: 0.72 },
  cardBody: { flex: 1, minWidth: 0 },
  itemTitle: { color: '#0F172A', fontSize: 15, fontWeight: '900' },
  uses: { color: '#7C3AED', fontSize: 11, fontWeight: '700', marginTop: 2 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  readyBadge: { backgroundColor: '#DCFCE7' },
  readyBadgeText: { color: '#15803D' },
  draftBadge: { backgroundColor: '#FEF3C7' },
  draftBadgeText: { color: '#A16207' },
  previewRoot: { flex: 1, backgroundColor: '#F4F7FB' },
  previewHeader: { minHeight: 76, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E6EEF8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  previewHeaderText: { flex: 1 },
  previewEyebrow: { color: '#2563EB', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  previewTitle: { color: '#0F172A', fontSize: 20, fontWeight: '900', marginTop: 3 },
  closeButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  previewFooter: { minHeight: 88, padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E6EEF8', flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewFooterBody: { flex: 1, minWidth: 0 },
});

export const REVIEWED_OVERLAP_JUSTIFICATION = 'source_combined_or_nested';

export function reviewedOverlapJustification(item) {
  return item?.evidence?.reviewedOverlapJustification ?? null;
}

export function declaredSemanticRanges(item) {
  const evidence = item?.evidence;
  if (Number.isInteger(evidence?.pageNumber) && Number.isInteger(evidence?.start)
      && Number.isInteger(evidence?.end)) {
    return [{ pageNumber: evidence.pageNumber, startOffset: evidence.start, endOffset: evidence.end }];
  }
  if (evidence?.kind === 'multi_segment_reconstruction' && Array.isArray(evidence?.segments)) {
    return evidence.segments.map(segment => ({
      pageNumber: segment.pageNumber, startOffset: segment.start, endOffset: segment.end,
    }));
  }
  return [];
}

export function hasDeclaredSemanticEvidence(item) {
  return declaredSemanticRanges(item).length > 0;
}

export function isReviewedOverlapPair(left, right) {
  return left?.exact === true && right?.exact === true
    && left?.declared === true && right?.declared === true
    && left?.justification === REVIEWED_OVERLAP_JUSTIFICATION
    && right?.justification === REVIEWED_OVERLAP_JUSTIFICATION
    && left?.documentId === right?.documentId
    && left?.leafId === right?.leafId
    && left?.evidenceId !== right?.evidenceId
    && left?.text !== right?.text
    && left?.fullRangeIdentity !== right?.fullRangeIdentity;
}

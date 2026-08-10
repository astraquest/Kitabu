-- Seed the deterministic first-wave preview only when a platform-admin actor
-- already exists. This is forward-only and never creates or changes a user.
DO $$
DECLARE
  actor_id UUID;
  bundle_payload JSONB := $bundle$
{"manifest":{"manifestVersion":1,"bundleId":"ken-cbc-lower-primary-first-wave","revision":"2026-08-10.1","sha256":"cbc37ca1e1a531018a5cfe68c21798c380d7ee25e37e00a9a81072c8e67eb1ad","protocolVersion":"1.0.1","sceneSchemaVersion":"1.0.1","minimumAppBuild":1,"components":[{"componentId":"trace-construct","componentVersion":"1.0.0"},{"componentId":"authored-interaction","componentVersion":"1.0.0"},{"componentId":"structured-response","componentVersion":"1.0.0"},{"componentId":"classify-sort-match-rank","componentVersion":"1.0.0"}],"graders":[{"graderId":"kitabu.sealed-numeric-answer","graderVersion":"1.0.0"},{"graderId":"ordered-item-ids","graderVersion":"1.0.0"}],"assetManifest":{"path":"lower-primary-first-wave/assets.json","sha256":"b7a92467bb7cf5d30b9be0baac99b8c0769f9162f0c8e392d647c432f7c68053"},"scenes":[{"sceneId":"ken-cbc-g1-mathematics.trace-curved-line-001","sceneVersion":"1.0.0","path":"lower-primary-first-wave/ken-cbc-g1-mathematics.trace-curved-line-001.scene.json","sha256":"fd5c70c674c566c2d00a0be3f1be646d1cdad8c5549a8d734ce01527ac5fd851"},{"sceneId":"ken-cbc-g1-science-health.classify-food-001","sceneVersion":"1.0.0","path":"lower-primary-first-wave/ken-cbc-g1-science-health.classify-food-001.scene.json","sha256":"095de134ba254f433fb55d380ec56924b4f12fdf538da74e24ca4b827894e5b3"},{"sceneId":"ken-cbc-g2-mathematics.count-apples-001","sceneVersion":"1.0.0","path":"lower-primary-first-wave/ken-cbc-g2-mathematics.count-apples-001.scene.json","sha256":"8ab10b6cd8e9d1ca4068a262436bfeb29562b68bcf8285192bf25806da9675b4"},{"sceneId":"ken-cbc-g2-mathematics.order-numbers-001","sceneVersion":"1.0.0","path":"lower-primary-first-wave/ken-cbc-g2-mathematics.order-numbers-001.scene.json","sha256":"0fa946b6b5649f9483cd8a28f50fa954bda2e78551b034b230363afb6a8bcad1"}],"release":{"channel":"preview","releaseId":"lower-primary-first-wave-2026-08-10-1"}},"scenes":[{"identity":{"sceneId":"ken-cbc-g1-mathematics.trace-curved-line-001","schemaVersion":"1.0.1"},"component":{"componentId":"trace-construct","componentVersion":"1.0.0"},"purpose":"instruction","prompt":{"default":"Choose the curved line."},"props":{"mode":"trace-path","targets":[{"id":"curved-line","label":"〰","accessibleDescription":"A curved line"},{"id":"straight-line","label":"—","accessibleDescription":"A straight line"}],"selectionCount":1,"instruction":{"default":"Tap the line that bends."},"accessibility":{"selectionLabel":{"default":"Line choices"}}},"evidenceClaims":[{"claimId":"g1-mathematics-identifies-curved-line","description":{"default":"Identifies a curved line from familiar line choices."},"evidenceTypes":["observation"]}],"completion":{"completionRuleId":"component-defined","kind":"component-defined"},"tutorPermissions":[],"assets":{"manifestId":"g1-curved-line-assets","assets":[]}}, {"identity":{"sceneId":"ken-cbc-g1-science-health.classify-food-001","schemaVersion":"1.0.1"},"component":{"componentId":"authored-interaction","componentVersion":"1.0.0"},"purpose":"instruction","prompt":{"default":"Classify each food as a fruit or a vegetable."},"props":{"mode":"classify","instruction":"Tap a food, then tap its group.","items":[{"id":"mango","label":"Mango","accessibleDescription":"A mango"},{"id":"carrot","label":"Carrot","accessibleDescription":"A carrot"}],"groups":[{"id":"fruit","label":"Fruit"},{"id":"vegetable","label":"Vegetable"}]},"evidenceClaims":[{"claimId":"g1-science-health-classifies-food","description":{"default":"Classifies familiar foods into fruit and vegetable groups."},"evidenceTypes":["observation"]}],"completion":{"completionRuleId":"component-defined","kind":"component-defined"},"tutorPermissions":[],"assets":{"manifestId":"g1-classify-food-assets","assets":[]}}, {"identity":{"sceneId":"ken-cbc-g2-mathematics.count-apples-001","schemaVersion":"1.0.1"},"component":{"componentId":"structured-response","componentVersion":"1.0.0"},"purpose":"practice","prompt":{"default":"Count the apples: 🍎 🍎 🍎 🍎. Enter the number of apples."},"props":{"mode":"numeric","normalization":{"allowSurroundingWhitespace":true,"allowThousandsSeparators":true,"locale":"en-KE"},"accessibility":{"inputLabel":{"default":"Number of apples"}}},"evidenceClaims":[{"claimId":"g2-mathematics-counts-apples","description":{"default":"Counts a small set of objects and records the total."},"evidenceTypes":["answer"]}],"grader":{"graderId":"kitabu.sealed-numeric-answer","graderVersion":"1.0.0","mode":"exact"},"completion":{"completionRuleId":"submit-response","kind":"submitted","requiredClaimIds":["g2-mathematics-counts-apples"]},"tutorPermissions":[],"assets":{"manifestId":"ken-cbc-g2-mathematics.count-apples-001.assets","assets":[]},"attemptPolicy":{"maxAttempts":2,"feedbackTiming":"after-attempts","revealAnswer":"never"}}, {"identity":{"sceneId":"ken-cbc-g2-mathematics.order-numbers-001","schemaVersion":"1.0.1"},"component":{"componentId":"classify-sort-match-rank","componentVersion":"1.0.0"},"purpose":"practice","prompt":{"default":"Order 12, 5, and 9 from smallest to largest."},"props":{"mode":"ranked-list","items":[{"id":"number-12","label":"12","value":12,"accessibleDescription":"twelve"},{"id":"number-5","label":"5","value":5,"accessibleDescription":"five"},{"id":"number-9","label":"9","value":9,"accessibleDescription":"nine"}],"orderingRules":{"direction":"ascending"},"allowMultiplePlacements":false,"unplacedPolicy":"all-items-required","layout":{"orientation":"vertical","showPositionNumbers":true},"shuffleSeed":"g2-order-numbers-001","explanationPolicy":{"required":false},"keyboardMoveModel":"move-buttons"},"evidenceClaims":[{"claimId":"g2-mathematics-orders-numbers","description":{"default":"Orders three numbers from smallest to largest."},"evidenceTypes":["answer"]}],"grader":{"graderId":"ordered-item-ids","graderVersion":"1.0.0","mode":"exact"},"completion":{"completionRuleId":"ordered-list-complete","kind":"evidence-claims-met","requiredClaimIds":["g2-mathematics-orders-numbers"]},"tutorPermissions":[],"assets":{"manifestId":"g2-order-numbers-assets","assets":[]},"attemptPolicy":{"maxAttempts":2,"feedbackTiming":"on-submit","revealAnswer":"never"}}],"assetManifest":{"manifestVersion":1,"assets":[]}}
  $bundle$::JSONB;
BEGIN
  SELECT u.id INTO actor_id
  FROM users u
  JOIN user_roles ur ON ur.user_id = u.id
  WHERE ur.role = 'platform_admin'::user_role
  ORDER BY u.id
  LIMIT 1;

  IF actor_id IS NULL THEN
    RAISE NOTICE 'Skipped lower-primary first-wave preview seed: no platform-admin actor exists.';
    RETURN;
  END IF;

  INSERT INTO interactive_learning_bundles
    (bundle_id, revision, sha256, channel, release_id, manifest, payload, status, created_by, approved_by, approved_at)
  VALUES (
    bundle_payload->'manifest'->>'bundleId',
    bundle_payload->'manifest'->>'revision',
    bundle_payload->'manifest'->>'sha256',
    bundle_payload->'manifest'->'release'->>'channel',
    bundle_payload->'manifest'->'release'->>'releaseId',
    bundle_payload->'manifest',
    bundle_payload,
    'approved',
    actor_id,
    actor_id,
    NOW()
  )
  ON CONFLICT (bundle_id, revision) DO NOTHING;

  INSERT INTO interactive_learning_release_history (channel, bundle_id, revision, release_id, action, actor_user_id)
  SELECT
    bundle_payload->'manifest'->'release'->>'channel',
    bundle_payload->'manifest'->>'bundleId',
    bundle_payload->'manifest'->>'revision',
    bundle_payload->'manifest'->'release'->>'releaseId',
    'publish',
    actor_id
  WHERE NOT EXISTS (
    SELECT 1 FROM interactive_learning_release_history
    WHERE release_id = bundle_payload->'manifest'->'release'->>'releaseId' AND action = 'publish'
  );

  INSERT INTO interactive_learning_release_pointers (channel, bundle_id, revision, release_id, updated_by)
  SELECT
    bundle_payload->'manifest'->'release'->>'channel',
    bundle_payload->'manifest'->>'bundleId',
    bundle_payload->'manifest'->>'revision',
    bundle_payload->'manifest'->'release'->>'releaseId',
    actor_id
  WHERE NOT EXISTS (
    SELECT 1 FROM interactive_learning_release_pointers
    WHERE channel = bundle_payload->'manifest'->'release'->>'channel'
  );
END $$;

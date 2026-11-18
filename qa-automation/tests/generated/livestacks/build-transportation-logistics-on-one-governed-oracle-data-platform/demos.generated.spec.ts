import { test } from '../../../support/test.js';
import {
  liveStackBundleTestTitle,
  resolveLiveStackBundle,
  runLiveStackBundleTest,
} from '../../../support/liveStackBundleTests.js';

const slug = 'build-transportation-logistics-on-one-governed-oracle-data-platform';
const component = 'demos' as const;
const resolution = resolveLiveStackBundle(slug);

test.describe(`LiveStack bundle ${slug} ${component}`, {
  tag: ['@generated', '@livestack', `@${component}`],
}, () => {
  test.describe.configure({ timeout: 360_000 });

  if (resolution.status === 'missing-index') {
    test('catalog index is not generated', async () => {
      throw new Error(resolution.message);
    });
    return;
  }

  const item = resolution.item;
  if (!item) {
    test(`catalog index does not contain LiveStack bundle ${slug}`, async () => {
      throw new Error(
        `Generated catalog index does not contain LiveStack bundle slug "${slug}". ` +
          'Regenerate the index and reconcile tests/data/livestack-bundle-targets.json.',
      );
    });
    return;
  }

  test(liveStackBundleTestTitle(component, item), async (fixtures, testInfo) => {
    await runLiveStackBundleTest(component, item, fixtures, testInfo);
  });
});


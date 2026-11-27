import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPublicDesignCss,
  createDefaultSiteDesignConfig,
  mergeSiteDesignConfig,
  resetDesignSection,
  resolveCardAppearance,
  resolveCollectionGridLayout,
  resolveSectionContainerStyle,
  sanitizeSiteDesignForFirestore,
} from './designSystem';

test('mergeSiteDesignConfig safely normalizes partial, out-of-range, and invalid payloads', () => {
  const merged = mergeSiteDesignConfig(
    {
      status: 'draft',
      global: {
        visualTheme: 'clean_bento',
        containerMaxWidthPx: 99999,
        colors: {
          primary: '#0F3D3A',
          background: 'javascript:alert(1)',
        },
        typography: {
          displayFont: 'playfair',
          bodyFont: 'not_a_real_font',
          baseFontSizePx: 2,
          headingScale: 4,
        },
      },
      products: {
        section: {
          colsDesktop: 99,
          colsMobile: 0,
          layout: 'bento',
        },
        card: {
          aspectRatio: '1/1',
          borderRadiusPx: 999,
          imagePosition: 'left',
        },
      },
      home: {
        sectionOrder: ['products', 'hero', 'invalid_key', 'hero'],
      },
    },
    'draft'
  );

  assert.equal(merged.status, 'draft');
  assert.equal(merged.global.visualTheme, 'clean_bento');
  assert.equal(merged.global.containerMaxWidthPx, 1536);
  assert.equal(merged.global.colors.primary, '#0F3D3A');
  assert.equal(merged.global.colors.background, '');
  assert.equal(merged.global.typography.displayFont, 'playfair');
  assert.equal(merged.global.typography.bodyFont, 'inter');
  assert.equal(merged.global.typography.baseFontSizePx, 12);
  assert.equal(merged.global.typography.headingScale, 1.35);

  assert.equal(merged.products.section.colsDesktop, 6);
  assert.equal(merged.products.section.colsMobile, 1);
  assert.equal(merged.products.section.layout, 'bento');
  assert.equal(merged.products.card.aspectRatio, '1/1');
  assert.equal(merged.products.card.borderRadiusPx, 32);
  assert.equal(merged.products.card.imagePosition, 'left');

  // Section order preserves valid custom order first and appends missing defaults without duplicates
  assert.equal(merged.home.sectionOrder[0], 'products');
  assert.equal(merged.home.sectionOrder[1], 'hero');
  assert.equal(new Set(merged.home.sectionOrder).size, merged.home.sectionOrder.length);
});

test('resetDesignSection resets ONLY the targeted section without mutating other sections', () => {
  const custom = createDefaultSiteDesignConfig('draft');
  custom.global.colors.primary = '#224466';
  custom.products.section.colsDesktop = 3;
  custom.portfolio.card.shape = 'rounded';
  custom.portfolio.card.aspectRatio = '1/1';
  custom.footer.backgroundColor = '#111111';

  const afterResetPortfolio = resetDesignSection(custom, 'portfolio');

  // Portfolio reset to defaults
  assert.equal(afterResetPortfolio.portfolio.card.shape, 'theme');
  assert.equal(afterResetPortfolio.portfolio.card.aspectRatio, '16/10');
  // Other sections strictly preserved
  assert.equal(afterResetPortfolio.global.colors.primary, '#224466');
  assert.equal(afterResetPortfolio.products.section.colsDesktop, 3);
  assert.equal(afterResetPortfolio.footer.backgroundColor, '#111111');
});

test('resolveCollectionGridLayout switches accurately across desktop, tablet, mobile, list, and horizontal modes', () => {
  const desktopGrid = resolveCollectionGridLayout({
    layout: 'grid',
    colsDesktop: 4,
    colsTablet: 2,
    colsMobile: 1,
    gapPx: 16,
    viewport: 'desktop',
  });
  assert.equal(desktopGrid.activeCols, 4);
  assert.equal(desktopGrid.style.gridTemplateColumns, 'repeat(4, minmax(0, 1fr))');
  assert.equal(desktopGrid.style.gap, '16px');

  const mobileGrid = resolveCollectionGridLayout({
    layout: 'grid',
    colsDesktop: 4,
    colsTablet: 2,
    colsMobile: 1,
    gapPx: 12,
    viewport: 'mobile',
  });
  assert.equal(mobileGrid.activeCols, 1);
  assert.equal(mobileGrid.style.gridTemplateColumns, 'repeat(1, minmax(0, 1fr))');

  const listLayout = resolveCollectionGridLayout({
    layout: 'list',
    colsDesktop: 5,
    colsTablet: 3,
    colsMobile: 2,
    gapPx: 14,
    viewport: 'desktop',
  });
  assert.equal(listLayout.isList, true);
  assert.equal(listLayout.activeCols, 1);

  const horizontalLayout = resolveCollectionGridLayout({
    layout: 'horizontal',
    colsDesktop: 5,
    colsTablet: 3,
    colsMobile: 2,
    gapPx: 14,
    viewport: 'desktop',
  });
  assert.equal(horizontalLayout.isHorizontal, true);
  assert.match(horizontalLayout.className, /overflow-x-auto/);
});

test('resolveCardAppearance respects per-item override, theme defaults, and mobile image override', () => {
  const cfg = createDefaultSiteDesignConfig('published');
  cfg.portfolio.card.shape = 'rounded';
  cfg.portfolio.card.imagePosition = 'left';
  cfg.portfolio.card.borderWidthPx = 3;
  cfg.portfolio.card.borderColor = '#0F3D3A';

  const desktopCard = resolveCardAppearance(
    cfg.portfolio.card,
    'neo_brutalist',
    'desktop',
    cfg.responsive,
    { aspectRatio: '3/4' }
  );
  assert.equal(desktopCard.effectiveImagePosition, 'left');
  assert.equal(desktopCard.aspectClass, 'aspect-[3/4]');
  assert.equal(desktopCard.articleStyle.borderRadius, '16px');
  assert.equal(desktopCard.articleStyle.borderWidth, '3px');
  assert.equal(desktopCard.articleStyle.borderColor, '#0F3D3A');

  // Default mobile responsive imagePositionOverride is 'inherit' (non-intrusive)
  const mobileInherited = resolveCardAppearance(
    cfg.portfolio.card,
    'clean_bento',
    'mobile',
    cfg.responsive
  );
  assert.equal(mobileInherited.effectiveImagePosition, 'left');

  // Explicit mobile imagePositionOverride forces 'top' on mobile
  cfg.responsive.mobile.imagePositionOverride = 'top';
  const mobileCard = resolveCardAppearance(
    cfg.portfolio.card,
    'clean_bento',
    'mobile',
    cfg.responsive
  );
  assert.equal(mobileCard.effectiveImagePosition, 'top');
});

test('buildPublicDesignCss emits zero intrusive overrides on default config and scopes custom overrides cleanly', () => {
  const defaultCfg = createDefaultSiteDesignConfig('published');
  const defaultCss = buildPublicDesignCss(defaultCfg, '.scs-public-root', 'desktop');
  assert.equal(defaultCss, '');

  const customCfg = createDefaultSiteDesignConfig('published');
  customCfg.global.typography.displayFont = 'playfair';
  customCfg.global.colors.background = '#101414';
  customCfg.global.colors.buttonBg = '#6C151E';
  customCfg.global.colors.buttonText = '#FFFFFF';

  const customCss = buildPublicDesignCss(customCfg, '.scs-preview-canvas', 'tablet');
  assert.match(customCss, /"Playfair Display"/);
  assert.match(customCss, /background-color: #101414/);
  assert.match(customCss, /\.scs-preview-canvas \.nb-btn-primary/);
});

test('resolveSectionContainerStyle preserves native CSS on defaults and scales custom padding by viewport', () => {
  const cfg = createDefaultSiteDesignConfig('published');
  const untouched = resolveSectionContainerStyle(
    cfg.home.sections.services,
    cfg.global,
    'desktop',
    cfg.responsive
  );
  assert.equal(untouched.sectionStyle.paddingTop, undefined);
  assert.equal(untouched.sectionStyle.paddingBottom, undefined);
  assert.equal(untouched.containerStyle.maxWidth, undefined);

  cfg.home.sections.services.paddingYPx = 50;
  cfg.home.sections.services.backgroundColor = '#EFEFEF';
  cfg.home.sections.services.fontFamily = 'lora';
  cfg.responsive.mobile.sectionPaddingScale = 0.8;

  const desktop = resolveSectionContainerStyle(
    cfg.home.sections.services,
    cfg.global,
    'desktop',
    cfg.responsive
  );
  const mobile = resolveSectionContainerStyle(
    cfg.home.sections.services,
    cfg.global,
    'mobile',
    cfg.responsive
  );

  assert.equal(desktop.sectionStyle.paddingTop, '50px');
  assert.equal(mobile.sectionStyle.paddingTop, '40px');
  assert.equal(desktop.sectionStyle.backgroundColor, '#EFEFEF');
  assert.match(String(desktop.sectionStyle.fontFamily), /Lora/);
});

test('mergeSiteDesignConfig selectively restores legacy schemaVersion 1 homepage regressions while preserving theme and custom design', () => {
  const legacyPublished = {
    schemaVersion: 1,
    status: 'published',
    global: {
      visualTheme: 'clean_bento',
      containerMaxWidthPx: 1088,
      colors: { primary: '#0F3D3A' },
      typography: {
        displayFont: 'space_grotesk',
        bodyFont: 'inter',
        baseFontSizePx: 14,
        lineHeight: 1.55,
      },
    },
    header: { paddingXPx: 24, ctaLabel: 'Konsultasi Gratis' },
    home: {
      sections: {
        hero: { paddingYPx: 28 },
        categories: { paddingYPx: 20 },
        services: { paddingYPx: 36 },
        products: { paddingYPx: 56 }, // intentionally customized by admin — must be preserved
      },
    },
    responsive: {
      tablet: { textScale: 0.96, sectionPaddingScale: 0.9 },
      mobile: {
        textScale: 0.94,
        sectionPaddingScale: 0.8,
        cardSize: 'compact',
        imagePositionOverride: 'top',
      },
    },
  };

  const migrated = mergeSiteDesignConfig(legacyPublished, 'published');
  assert.equal(migrated.schemaVersion, 2);
  // Restored pre-Design-Studio homepage baselines:
  assert.equal(migrated.global.containerMaxWidthPx, 1280);
  assert.equal(migrated.global.typography.baseFontSizePx, 16);
  assert.equal(migrated.global.typography.lineHeight, 1.5);
  assert.equal(migrated.header.paddingXPx, 0);
  assert.equal(migrated.home.sections.hero.paddingYPx, 0);
  assert.equal(migrated.home.sections.categories.paddingYPx, 0);
  assert.equal(migrated.home.sections.services.paddingYPx, 0);
  assert.equal(migrated.responsive.tablet.textScale, 1);
  assert.equal(migrated.responsive.mobile.textScale, 1);
  assert.equal(migrated.responsive.mobile.sectionPaddingScale, 1);
  assert.equal(migrated.responsive.mobile.cardSize, 'normal');
  assert.equal(migrated.responsive.mobile.imagePositionOverride, 'inherit');
  // Strictly preserved admin settings:
  assert.equal(migrated.global.visualTheme, 'clean_bento');
  assert.equal(migrated.global.colors.primary, '#0F3D3A');
  assert.equal(migrated.header.ctaLabel, 'Konsultasi Gratis');
  assert.equal(migrated.home.sections.products.paddingYPx, 56);
});

test('mergeSiteDesignConfig preserves intentional schemaVersion 2 values without resetting them', () => {
  const intentionalV2 = {
    schemaVersion: 2,
    status: 'published',
    global: {
      visualTheme: 'clean_bento',
      containerMaxWidthPx: 1088,
      typography: { baseFontSizePx: 14, lineHeight: 1.55 },
    },
    header: { paddingXPx: 24 },
    home: { sections: { hero: { paddingYPx: 28 }, services: { paddingYPx: 36 } } },
  };

  const merged = mergeSiteDesignConfig(intentionalV2, 'published');
  assert.equal(merged.schemaVersion, 2);
  assert.equal(merged.global.containerMaxWidthPx, 1088);
  assert.equal(merged.global.typography.baseFontSizePx, 14);
  assert.equal(merged.global.typography.lineHeight, 1.55);
  assert.equal(merged.header.paddingXPx, 24);
  assert.equal(merged.home.sections.hero.paddingYPx, 28);
  assert.equal(merged.home.sections.services.paddingYPx, 36);
});

test('sanitizeSiteDesignForFirestore removes undefined keys and enforces status + updatedBy', () => {
  const cfg = createDefaultSiteDesignConfig('draft');
  cfg.home.sections.services.heroLayout = undefined;
  const payload = sanitizeSiteDesignForFirestore(cfg, 'published', 'admin@studio.id');

  assert.equal(payload.status, 'published');
  assert.equal(payload.updatedBy, 'admin@studio.id');
  assert.equal('heroLayout' in payload.home.sections.services, false);
  assert.equal('updatedAt' in payload, false);
});

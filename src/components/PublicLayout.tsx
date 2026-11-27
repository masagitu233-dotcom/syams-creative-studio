import React, { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ToastStack } from './ToastStack';
import { useDesign } from '../contexts/DesignContext';
import { buildPublicDesignCss } from '../utils/designSystem';
import { buildMediaImageCandidates } from '../utils/studioLogic';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { design, viewport, isEmbeddedPreview } = useDesign();

  useEffect(() => {
    if (!isEmbeddedPreview) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [pathname, isEmbeddedPreview]);

  const designCss = useMemo(
    () => (isEmbeddedPreview ? '' : buildPublicDesignCss(design, '.scs-public-root', viewport)),
    [design, viewport, isEmbeddedPreview]
  );

  const bgCandidates = useMemo(() => {
    if (!design.identity.pageBackgroundImageUrl && !design.identity.pageBackgroundDriveFileId) {
      return [];
    }
    return buildMediaImageCandidates({
      src: design.identity.pageBackgroundImageUrl,
      driveFileId: design.identity.pageBackgroundDriveFileId || undefined,
      visibility: 'public',
    });
  }, [design.identity.pageBackgroundImageUrl, design.identity.pageBackgroundDriveFileId]);

  const bgUrl = bgCandidates[0]?.url || '';

  return (
    <div className="scs-public-root relative min-h-screen flex flex-col bg-[#F8F8E1] text-[#171717]">
      {!isEmbeddedPreview && designCss && <style id="scs-global-design-css">{designCss}</style>}

      {bgUrl && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url("${bgUrl}")`,
            opacity: design.identity.pageBackgroundOpacity,
          }}
        />
      )}

      <div className="relative z-10 flex flex-col min-h-screen">
        {design.header.visible && <Navbar />}
        <motion.main
          key={isEmbeddedPreview ? 'preview-main' : pathname}
          initial={isEmbeddedPreview ? false : { opacity: 0.01 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="flex-1"
        >
          {children}
        </motion.main>
        {design.footer.visible && <Footer />}
      </div>
      {!isEmbeddedPreview && <ToastStack />}
    </div>
  );
}

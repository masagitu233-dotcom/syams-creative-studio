import { useEffect, useState } from 'react';
import { Image as ImageIcon, RotateCcw, Save } from 'lucide-react';
import {
  CardDesignEditor,
  ColorPickerControl,
  ControlGroup,
  RangeSliderControl,
  SectionDesignEditor,
  SegmentedControl,
} from './DesignControls';
import { AdminImagePicker } from '../AdminImagePicker';
import { StudioImage } from '../../StudioImage';
import type {
  CardAspectRatio,
  CardDesignConfig,
  CardImagePosition,
  CardShadowPreset,
  CardShapePreset,
  CardSizePreset,
  CatalogDesignConfig,
  SectionLayoutDesignConfig,
} from '../../../types/design';
import type { DriveFolderRecord, MediaAsset, MediaUsage } from '../../../types/studio';

export interface CatalogItemSummary {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  driveFileId: string;
  isPublished: boolean;
}

interface DesignCatalogTabEditorProps {
  categoryLabel: string;
  usage: Extract<MediaUsage, 'product' | 'service' | 'portfolio'>;
  config: CatalogDesignConfig;
  showPriceControls?: boolean;
  showMetaToggle?: boolean;
  items: CatalogItemSummary[];
  media: MediaAsset[];
  driveFolders: DriveFolderRecord[];
  actor: { uid: string; email: string };
  onSectionChange: (patch: Partial<SectionLayoutDesignConfig>) => void;
  onCardChange: (patch: Partial<CardDesignConfig>) => void;
  onItemOverrideChange: (itemId: string, override: Partial<CardDesignConfig> | null) => void;
  onSaveItemThumbnail: (
    itemId: string,
    next: { imageUrl: string; driveFileId: string }
  ) => Promise<void>;
  onMediaUploaded: () => Promise<void>;
  onToast: (t: { type: 'success' | 'error' | 'info'; title: string; description?: string }) => void;
}

export function DesignCatalogTabEditor({
  categoryLabel,
  usage,
  config,
  showPriceControls = true,
  showMetaToggle = false,
  items,
  media,
  driveFolders,
  actor,
  onSectionChange,
  onCardChange,
  onItemOverrideChange,
  onSaveItemThumbnail,
  onMediaUploaded,
  onToast,
}: DesignCatalogTabEditorProps) {
  const [selectedItemId, setSelectedItemId] = useState<string>(items[0]?.id || '');
  const [thumbDraft, setThumbDraft] = useState<{ imageUrl: string; driveFileId: string }>({
    imageUrl: '',
    driveFileId: '',
  });
  const [savingThumb, setSavingThumb] = useState(false);

  const selectedItem = items.find((i) => i.id === selectedItemId) || items[0] || null;

  useEffect(() => {
    if (!selectedItem) return;
    setSelectedItemId(selectedItem.id);
    setThumbDraft({
      imageUrl: selectedItem.imageUrl,
      driveFileId: selectedItem.driveFileId,
    });
  }, [selectedItem?.id, selectedItem?.imageUrl, selectedItem?.driveFileId]);

  const currentOverride = selectedItem ? config.itemOverrides[selectedItem.id] || {} : {};
  const hasOverride = Object.keys(currentOverride).length > 0;

  const isThumbDirty =
    selectedItem !== null &&
    (thumbDraft.imageUrl !== selectedItem.imageUrl ||
      thumbDraft.driveFileId !== selectedItem.driveFileId);

  function patchItemOverride(patch: Partial<CardDesignConfig>) {
    if (!selectedItem) return;
    onItemOverrideChange(selectedItem.id, { ...currentOverride, ...patch });
  }

  async function handleSaveThumb() {
    if (!selectedItem) return;
    if (!thumbDraft.imageUrl.trim() && !thumbDraft.driveFileId.trim()) {
      onToast({
        type: 'error',
        title: 'Gambar Kosong',
        description: 'Pilih atau unggah gambar terlebih dahulu sebelum menyimpan thumbnail.',
      });
      return;
    }
    setSavingThumb(true);
    try {
      await onSaveItemThumbnail(selectedItem.id, thumbDraft);
    } finally {
      setSavingThumb(false);
    }
  }

  return (
    <div className="space-y-3.5">
      <ControlGroup
        title={`Tata Letak & Warna Halaman ${categoryLabel}`}
        subtitle="Mengatur mode grid/bento/list/slider, kolom responsif, jarak, warna, dan tipografi khusus bagian ini."
        defaultOpen
      >
        <SectionDesignEditor
          section={config.section}
          onChange={onSectionChange}
          showVisibilityToggle={false}
        />
      </ControlGroup>

      <ControlGroup
        title={`Desain Card ${categoryLabel}`}
        subtitle="Pengaturan ukuran, bentuk, rasio gambar, posisi gambar, border, bayangan, warna, dan efek hover."
        defaultOpen
      >
        <CardDesignEditor
          card={config.card}
          onChange={onCardChange}
          showPriceControls={showPriceControls}
          showMetaToggle={showMetaToggle}
        />
      </ControlGroup>

      <ControlGroup
        title={`Kustomisasi & Thumbnail Item Individual (${items.length})`}
        subtitle="Atur gaya card khusus atau ganti gambar thumbnail untuk item tertentu secara langsung."
        badge={hasOverride ? 'Kustom' : undefined}
        defaultOpen={false}
      >
        {items.length === 0 ? (
          <p className="text-xs text-[#525252]">
            Belum ada item {categoryLabel.toLowerCase()} di database.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Item Picker */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#171717]">
                Pilih Item {categoryLabel}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {items.map((item) => {
                  const active = selectedItem?.id === item.id;
                  const customized = Boolean(
                    config.itemOverrides[item.id] &&
                      Object.keys(config.itemOverrides[item.id]).length > 0
                  );
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedItemId(item.id)}
                      className={`flex items-center gap-2 p-2 rounded-[4px] border-2 text-left transition-colors cursor-pointer ${
                        active
                          ? 'border-[#0F3D3A] bg-[#F8F8E1] ring-2 ring-[#F3C95B]'
                          : 'border-[#171717]/25 bg-white hover:border-[#171717]'
                      }`}
                    >
                      <div className="w-12 h-9 shrink-0 rounded-[2px] overflow-hidden border border-[#171717]/40 bg-[#F1F1D3]">
                        <StudioImage
                          src={item.imageUrl}
                          driveFileId={item.driveFileId || undefined}
                          alt={item.title}
                          aspectClass="w-full h-full"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-display font-bold text-[#171717] truncate">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-[#525252] truncate">{item.subtitle}</p>
                      </div>
                      {customized && (
                        <span className="px-1.5 py-0.5 bg-[#0F3D3A] text-[#F3C95B] rounded-[2px] text-[9px] font-mono font-bold shrink-0">
                          Kustom
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedItem && (
              <>
                {/* Individual Card Style Overrides */}
                <div className="p-3 bg-[#F8F8E1]/60 border-2 border-[#171717]/30 rounded-[4px] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-display font-bold text-xs text-[#171717]">
                        Override Gaya Card: {selectedItem.title}
                      </p>
                      <p className="text-[11px] text-[#525252]">
                        Hanya memengaruhi kartu item ini tanpa mengubah kartu lainnya.
                      </p>
                    </div>
                    {hasOverride && (
                      <button
                        type="button"
                        onClick={() => onItemOverrideChange(selectedItem.id, null)}
                        className="nb-btn nb-btn-surface nb-btn-xs text-[#6C151E]"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset Item Ini
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SegmentedControl<CardShapePreset>
                      label="Bentuk Card"
                      value={currentOverride.shape ?? config.card.shape}
                      onChange={(shape) => patchItemOverride({ shape })}
                      options={[
                        { value: 'theme', label: 'Tema' },
                        { value: 'sharp', label: 'Tajam' },
                        { value: 'square', label: 'Kotak' },
                        { value: 'rounded', label: 'Rounded' },
                        { value: 'soft_pill', label: 'Soft Pill' },
                      ]}
                    />

                    <SegmentedControl<CardAspectRatio>
                      label="Rasio Gambar"
                      value={currentOverride.aspectRatio ?? config.card.aspectRatio}
                      onChange={(aspectRatio) => patchItemOverride({ aspectRatio })}
                      options={[
                        { value: '1/1', label: '1:1' },
                        { value: '4/3', label: '4:3' },
                        { value: '3/4', label: '3:4' },
                        { value: '16/10', label: '16:10' },
                        { value: '16/9', label: '16:9' },
                      ]}
                    />

                    <SegmentedControl<CardImagePosition>
                      label="Posisi Gambar"
                      value={currentOverride.imagePosition ?? config.card.imagePosition}
                      onChange={(imagePosition) => patchItemOverride({ imagePosition })}
                      options={[
                        { value: 'top', label: 'Atas' },
                        { value: 'left', label: 'Kiri' },
                        { value: 'right', label: 'Kanan' },
                        { value: 'background', label: 'Bg' },
                      ]}
                    />

                    <SegmentedControl<CardSizePreset>
                      label="Ukuran Card"
                      value={currentOverride.size ?? config.card.size}
                      onChange={(size) => patchItemOverride({ size })}
                      options={[
                        { value: 'compact', label: 'Kompak' },
                        { value: 'normal', label: 'Normal' },
                        { value: 'large', label: 'Besar' },
                      ]}
                    />

                    <SegmentedControl<CardShadowPreset>
                      label="Bayangan"
                      value={currentOverride.shadow ?? config.card.shadow}
                      onChange={(shadow) => patchItemOverride({ shadow })}
                      options={[
                        { value: 'theme', label: 'Tema' },
                        { value: 'none', label: 'Tanpa' },
                        { value: 'soft', label: 'Soft' },
                        { value: 'brutal', label: 'Brutal' },
                        { value: 'elevated', label: 'Elevated' },
                      ]}
                    />

                    <RangeSliderControl
                      label="Border Radius"
                      value={currentOverride.borderRadiusPx ?? config.card.borderRadiusPx}
                      min={0}
                      max={32}
                      nullable
                      onChange={(borderRadiusPx) => patchItemOverride({ borderRadiusPx })}
                    />

                    <ColorPickerControl
                      label="Background Card Item"
                      value={currentOverride.backgroundColor ?? ''}
                      onChange={(backgroundColor) => patchItemOverride({ backgroundColor })}
                    />
                    <ColorPickerControl
                      label="Border Card Item"
                      value={currentOverride.borderColor ?? ''}
                      onChange={(borderColor) => patchItemOverride({ borderColor })}
                    />
                  </div>
                </div>

                {/* Inline Thumbnail Media Picker */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#0F3D3A]" />
                      <span className="font-display font-bold text-xs text-[#171717]">
                        Kelola Gambar Thumbnail: {selectedItem.title}
                      </span>
                    </div>
                    {isThumbDirty && (
                      <button
                        type="button"
                        disabled={savingThumb}
                        onClick={() => void handleSaveThumb()}
                        className="nb-btn nb-btn-primary nb-btn-xs"
                      >
                        <Save className="w-3 h-3" />
                        {savingThumb ? 'Menyimpan...' : 'Simpan Thumbnail Item'}
                      </button>
                    )}
                  </div>

                  <AdminImagePicker
                    label={`Thumbnail ${selectedItem.title}`}
                    usage={usage}
                    entityKey={`${usage}-${selectedItem.id}`}
                    entityId={selectedItem.id}
                    entityName={selectedItem.title}
                    entityPublished={selectedItem.isPublished}
                    imageUrl={thumbDraft.imageUrl}
                    driveFileId={thumbDraft.driveFileId}
                    savedImageUrl={selectedItem.imageUrl}
                    savedDriveFileId={selectedItem.driveFileId}
                    media={media}
                    driveFolders={driveFolders}
                    actor={actor}
                    onChange={(next) => setThumbDraft(next)}
                    onMediaUploaded={onMediaUploaded}
                    onToast={onToast}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </ControlGroup>
    </div>
  );
}

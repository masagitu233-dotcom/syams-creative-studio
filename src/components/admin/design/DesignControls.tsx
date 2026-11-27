import React, { useState } from 'react';
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { DESIGN_FONT_OPTIONS } from '../../../utils/designSystem';
import type {
  CardAspectRatio,
  CardDesignConfig,
  CardHoverEffect,
  CardImagePosition,
  CardPricePosition,
  CardShadowPreset,
  CardShapePreset,
  CardSizePreset,
  DesignAlign,
  DesignContentPosition,
  DesignFontKey,
  DesignHeroLayout,
  DesignLayoutMode,
  SectionLayoutDesignConfig,
} from '../../../types/design';

const QUICK_PALETTE = [
  { label: 'Teal Studio', hex: '#0F3D3A' },
  { label: 'Mustard', hex: '#F3C95B' },
  { label: 'Burgundy', hex: '#6C151E' },
  { label: 'Sky Blue', hex: '#8ACCD5' },
  { label: 'Cream', hex: '#F8F8E1' },
  { label: 'Putih', hex: '#FFFFFF' },
  { label: 'Slate Light', hex: '#F4F5F1' },
  { label: 'Ink Dark', hex: '#171717' },
];

export function ControlGroup({
  title,
  subtitle,
  defaultOpen = true,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  badge?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-2 border-[#171717] rounded-[4px] bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3.5 py-2.5 bg-[#F8F8E1]/80 hover:bg-[#F3C95B]/25 border-b border-[#171717]/15 flex items-center justify-between gap-2 text-left cursor-pointer"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-xs sm:text-[13px] text-[#171717]">
              {title}
            </span>
            {badge && (
              <span className="px-1.5 py-0.5 bg-[#0F3D3A] text-[#F3C95B] rounded-[2px] font-mono text-[9px] font-bold">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-[#525252] leading-snug mt-0.5">{subtitle}</p>
          )}
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-[#171717] shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[#171717] shrink-0" />
        )}
      </button>
      {open && <div className="p-3.5 space-y-3.5">{children}</div>}
    </div>
  );
}

export function ColorPickerControl({
  label,
  value,
  onChange,
  placeholder = 'Ikuti Tema',
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const swatchColor = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(value) ? value : '#0F3D3A';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[11px] font-semibold text-[#171717]">{label}</label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[10px] font-semibold text-[#6C151E] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Ikuti Tema
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <label className="relative w-8 h-8 shrink-0 border-2 border-[#171717] rounded-[4px] overflow-hidden cursor-pointer bg-white">
          <input
            type="color"
            value={swatchColor}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`Pilih warna ${label}`}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <span
            className="block w-full h-full"
            style={{
              backgroundColor: value || 'transparent',
              backgroundImage: value
                ? undefined
                : 'repeating-linear-gradient(45deg, #e5e5c7 0 4px, #ffffff 4px 8px)',
            }}
          />
        </label>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="nb-input py-1 px-2 text-xs font-mono flex-1"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {QUICK_PALETTE.map((item) => (
          <button
            key={item.hex}
            type="button"
            title={`${item.label} (${item.hex})`}
            onClick={() => onChange(item.hex)}
            className={`w-4 h-4 rounded-[2px] border cursor-pointer transition-transform hover:scale-110 ${
              value.toUpperCase() === item.hex
                ? 'border-[#0F3D3A] ring-2 ring-[#F3C95B]'
                : 'border-[#171717]/40'
            }`}
            style={{ backgroundColor: item.hex }}
          />
        ))}
      </div>
    </div>
  );
}

export function RangeSliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit = 'px',
  displayZeroAs,
  nullable = false,
  onChange,
}: {
  label: string;
  value: number | null;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  displayZeroAs?: string;
  nullable?: boolean;
  onChange: (next: number | null) => void;
}) {
  const numericValue = value === null ? min : value;
  const readout =
    value === null
      ? 'Ikuti Tema'
      : value === 0 && displayZeroAs
        ? displayZeroAs
        : `${value}${unit}`;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-[11px] font-semibold text-[#171717]">{label}</label>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-[#0F3D3A] tabular-nums">
            {readout}
          </span>
          {nullable && value !== null && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-[10px] font-semibold text-[#6C151E] hover:underline cursor-pointer"
            >
              Tema
            </button>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={numericValue}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#0F3D3A] cursor-pointer"
      />
    </div>
  );
}

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-[11px] font-semibold text-[#171717]">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`px-2.5 py-1 text-[11px] font-display font-semibold rounded-[4px] border-2 transition-colors cursor-pointer ${
                active
                  ? 'bg-[#0F3D3A] text-[#F3C95B] border-[#171717]'
                  : 'bg-white text-[#262626] border-[#171717]/30 hover:border-[#171717]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ToggleControl({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-3 cursor-pointer select-none py-0.5">
      <div className="min-w-0">
        <span className="block text-xs font-semibold text-[#171717]">{label}</span>
        {description && (
          <span className="block text-[11px] text-[#525252] leading-snug">{description}</span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5.5 rounded-full border-2 border-[#171717] shrink-0 transition-colors cursor-pointer ${
          checked ? 'bg-[#0F3D3A]' : 'bg-[#E5E5C7]'
        }`}
      >
        <span
          className={`block w-3.5 h-3.5 rounded-full bg-white border border-[#171717] transition-transform ${
            checked ? 'translate-x-4.5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

export function FontSelectControl({
  label,
  value,
  allowInherit = false,
  onChange,
}: {
  label: string;
  value: DesignFontKey | '';
  allowInherit?: boolean;
  onChange: (next: DesignFontKey | '') => void;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-semibold text-[#171717]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as DesignFontKey | '')}
        className="nb-input py-1.5 text-xs"
      >
        {allowInherit && <option value="">Ikuti Font Global</option>}
        {DESIGN_FONT_OPTIONS.map((font) => (
          <option key={font.key} value={font.key}>
            {font.label} ({font.category})
          </option>
        ))}
      </select>
    </div>
  );
}

export function SectionDesignEditor({
  section,
  onChange,
  showHeroLayout = false,
  showVisibilityToggle = true,
  showCollectionGridControls = true,
  showCustomHeadingFields = true,
}: {
  section: SectionLayoutDesignConfig;
  onChange: (patch: Partial<SectionLayoutDesignConfig>) => void;
  showHeroLayout?: boolean;
  showVisibilityToggle?: boolean;
  showCollectionGridControls?: boolean;
  showCustomHeadingFields?: boolean;
}) {
  return (
    <div className="space-y-3">
      {showVisibilityToggle && (
        <ToggleControl
          label="Tampilkan Bagian Ini"
          description="Sembunyikan sementara tanpa menghapus konten."
          checked={section.visible}
          onChange={(visible) => onChange({ visible })}
        />
      )}

      {showHeroLayout && (
        <SegmentedControl<DesignHeroLayout>
          label="Model Tata Letak Hero"
          value={section.heroLayout || 'split_right'}
          onChange={(heroLayout) => onChange({ heroLayout })}
          options={[
            { value: 'split_right', label: 'Split Gambar Kanan' },
            { value: 'split_left', label: 'Split Gambar Kiri' },
            { value: 'centered', label: 'Tengah Minimalis' },
            { value: 'banner_overlay', label: 'Banner Overlay' },
          ]}
        />
      )}

      {showCollectionGridControls && (
        <>
          <SegmentedControl<DesignLayoutMode>
            label="Mode Tampilan Tata Letak"
            value={section.layout}
            onChange={(layout) => onChange({ layout })}
            options={[
              { value: 'grid', label: 'Grid' },
              { value: 'bento', label: 'Bento Grid' },
              { value: 'list', label: 'List' },
              { value: 'horizontal', label: 'Slider Horizontal' },
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <RangeSliderControl
              label="Kolom Desktop"
              value={section.colsDesktop}
              min={1}
              max={6}
              unit=" kol"
              onChange={(v) => onChange({ colsDesktop: v ?? 5 })}
            />
            <RangeSliderControl
              label="Kolom Tablet"
              value={section.colsTablet}
              min={1}
              max={4}
              unit=" kol"
              onChange={(v) => onChange({ colsTablet: v ?? 3 })}
            />
            <RangeSliderControl
              label="Kolom Mobile"
              value={section.colsMobile}
              min={1}
              max={3}
              unit=" kol"
              onChange={(v) => onChange({ colsMobile: v ?? 2 })}
            />
          </div>

          <RangeSliderControl
            label="Jumlah Maksimal Item Tampil"
            value={section.maxItems}
            min={0}
            max={24}
            unit=" item"
            displayZeroAs="Semua Item"
            onChange={(v) => onChange({ maxItems: v ?? 0 })}
          />
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <RangeSliderControl
          label="Jarak Antar Elemen (Gap)"
          value={section.gapPx}
          min={6}
          max={40}
          onChange={(v) => onChange({ gapPx: v ?? 12 })}
        />
        <RangeSliderControl
          label="Padding Vertikal Section"
          value={section.paddingYPx}
          min={0}
          max={96}
          displayZeroAs="Bawaan"
          onChange={(v) => onChange({ paddingYPx: v ?? 0 })}
        />
        <RangeSliderControl
          label="Margin Vertikal Section"
          value={section.marginYPx}
          min={0}
          max={48}
          displayZeroAs="0px"
          onChange={(v) => onChange({ marginYPx: v ?? 0 })}
        />
        <RangeSliderControl
          label="Lebar Maksimal Kontainer"
          value={section.maxWidthPx}
          min={0}
          max={1536}
          step={32}
          displayZeroAs="Ikuti Global"
          onChange={(v) => onChange({ maxWidthPx: v ?? 0 })}
        />
        <RangeSliderControl
          label="Tinggi Minimal Section"
          value={section.minHeightPx}
          min={0}
          max={720}
          step={20}
          displayZeroAs="Otomatis"
          onChange={(v) => onChange({ minHeightPx: v ?? 0 })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SegmentedControl<DesignAlign>
          label="Perataan Teks"
          value={section.textAlign}
          onChange={(textAlign) => onChange({ textAlign })}
          options={[
            { value: 'left', label: 'Kiri' },
            { value: 'center', label: 'Tengah' },
            { value: 'right', label: 'Kanan' },
          ]}
        />
        <SegmentedControl<DesignContentPosition>
          label="Posisi Vertikal Konten"
          value={section.contentPosition}
          onChange={(contentPosition) => onChange({ contentPosition })}
          options={[
            { value: 'start', label: 'Atas' },
            { value: 'center', label: 'Tengah' },
            { value: 'end', label: 'Bawah' },
          ]}
        />
      </div>

      {showCustomHeadingFields && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-[#171717]/15">
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-[#171717]">
              Judul Kustom Section (Opsional)
            </label>
            <input
              type="text"
              value={section.customTitle || ''}
              onChange={(e) => onChange({ customTitle: e.target.value })}
              placeholder="Kosongkan untuk judul bawaan"
              className="nb-input py-1.5 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-[#171717]">
              Subjudul Kustom (Opsional)
            </label>
            <input
              type="text"
              value={section.customSubtitle || ''}
              onChange={(e) => onChange({ customSubtitle: e.target.value })}
              placeholder="Kosongkan untuk subjudul bawaan"
              className="nb-input py-1.5 text-xs"
            />
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-[#171717]/15 space-y-3">
        <p className="text-[11px] font-display font-bold text-[#0F3D3A] uppercase tracking-wide">
          Tipografi &amp; Warna Bagian Ini (Independen)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FontSelectControl
            label="Font Bagian"
            value={section.fontFamily}
            allowInherit
            onChange={(fontFamily) => onChange({ fontFamily })}
          />
          <RangeSliderControl
            label="Ukuran Judul"
            value={section.headingSizePx}
            min={0}
            max={48}
            displayZeroAs="Ikuti Global"
            onChange={(v) => onChange({ headingSizePx: v ?? 0 })}
          />
          <RangeSliderControl
            label="Ukuran Deskripsi"
            value={section.descriptionSizePx}
            min={0}
            max={22}
            displayZeroAs="Ikuti Global"
            onChange={(v) => onChange({ descriptionSizePx: v ?? 0 })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <ColorPickerControl
            label="Background Section"
            value={section.backgroundColor}
            onChange={(backgroundColor) => onChange({ backgroundColor })}
          />
          <ColorPickerControl
            label="Warna Teks"
            value={section.textColor}
            onChange={(textColor) => onChange({ textColor })}
          />
          <ColorPickerControl
            label="Warna Aksen / Kicker"
            value={section.accentColor}
            onChange={(accentColor) => onChange({ accentColor })}
          />
          <ColorPickerControl
            label="Warna Border"
            value={section.borderColor}
            onChange={(borderColor) => onChange({ borderColor })}
          />
          <ColorPickerControl
            label="Background Tombol"
            value={section.buttonBg}
            onChange={(buttonBg) => onChange({ buttonBg })}
          />
          <ColorPickerControl
            label="Teks Tombol"
            value={section.buttonText}
            onChange={(buttonText) => onChange({ buttonText })}
          />
        </div>
      </div>
    </div>
  );
}

export function CardDesignEditor({
  card,
  onChange,
  showPriceControls = true,
  showMetaToggle = false,
}: {
  card: CardDesignConfig;
  onChange: (patch: Partial<CardDesignConfig>) => void;
  showPriceControls?: boolean;
  showMetaToggle?: boolean;
}) {
  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SegmentedControl<CardSizePreset>
          label="Ukuran Card"
          value={card.size}
          onChange={(size) => onChange({ size })}
          options={[
            { value: 'compact', label: 'Kompak' },
            { value: 'normal', label: 'Normal' },
            { value: 'large', label: 'Besar' },
          ]}
        />

        <SegmentedControl<CardShapePreset>
          label="Bentuk Card"
          value={card.shape}
          onChange={(shape) => onChange({ shape })}
          options={[
            { value: 'theme', label: 'Tema' },
            { value: 'sharp', label: 'Tajam' },
            { value: 'square', label: 'Kotak 1:1' },
            { value: 'rectangle', label: 'Persegi' },
            { value: 'rounded', label: 'Rounded' },
            { value: 'soft_pill', label: 'Soft Pill' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SegmentedControl<CardAspectRatio>
          label="Rasio Gambar (Aspect Ratio)"
          value={card.aspectRatio}
          onChange={(aspectRatio) => onChange({ aspectRatio })}
          options={[
            { value: '1/1', label: '1:1' },
            { value: '4/3', label: '4:3' },
            { value: '3/4', label: '3:4' },
            { value: '16/10', label: '16:10' },
            { value: '16/9', label: '16:9' },
          ]}
        />

        <SegmentedControl<CardImagePosition>
          label="Posisi Gambar di Card"
          value={card.imagePosition}
          onChange={(imagePosition) => onChange({ imagePosition })}
          options={[
            { value: 'top', label: 'Atas' },
            { value: 'left', label: 'Kiri' },
            { value: 'right', label: 'Kanan' },
            { value: 'background', label: 'Background' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SegmentedControl<CardShadowPreset>
          label="Bayangan (Shadow)"
          value={card.shadow}
          onChange={(shadow) => onChange({ shadow })}
          options={[
            { value: 'theme', label: 'Tema' },
            { value: 'none', label: 'Tanpa' },
            { value: 'soft', label: 'Soft' },
            { value: 'brutal', label: 'Brutal' },
            { value: 'elevated', label: 'Elevated' },
          ]}
        />

        <SegmentedControl<CardHoverEffect>
          label="Efek Hover Card"
          value={card.hoverEffect}
          onChange={(hoverEffect) => onChange({ hoverEffect })}
          options={[
            { value: 'theme', label: 'Tema' },
            { value: 'lift', label: 'Angkat' },
            { value: 'scale', label: 'Zoom Halus' },
            { value: 'border_accent', label: 'Aksen Border' },
            { value: 'none', label: 'Nonaktif' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <RangeSliderControl
          label="Radius Sudut (Border Radius)"
          value={card.borderRadiusPx}
          min={0}
          max={32}
          nullable
          onChange={(borderRadiusPx) => onChange({ borderRadiusPx })}
        />
        <RangeSliderControl
          label="Ketebalan Garis Border"
          value={card.borderWidthPx}
          min={0}
          max={4}
          nullable
          onChange={(borderWidthPx) => onChange({ borderWidthPx })}
        />
        <RangeSliderControl
          label="Lebar Maksimal Card"
          value={card.maxWidthPx}
          min={0}
          max={640}
          step={20}
          displayZeroAs="Otomatis (100%)"
          onChange={(v) => onChange({ maxWidthPx: v ?? 0 })}
        />
        <RangeSliderControl
          label="Tinggi Minimal Card"
          value={card.minHeightPx}
          min={0}
          max={520}
          step={20}
          displayZeroAs="Otomatis"
          onChange={(v) => onChange({ minHeightPx: v ?? 0 })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#171717]/15">
        <SegmentedControl<DesignAlign>
          label="Perataan Teks Card"
          value={card.textAlign}
          onChange={(textAlign) => onChange({ textAlign })}
          options={[
            { value: 'left', label: 'Kiri' },
            { value: 'center', label: 'Tengah' },
            { value: 'right', label: 'Kanan' },
          ]}
        />

        {showPriceControls && (
          <SegmentedControl<CardPricePosition>
            label="Posisi Harga"
            value={card.pricePosition}
            onChange={(pricePosition) => onChange({ pricePosition })}
            options={[
              { value: 'bottom', label: 'Bawah' },
              { value: 'top_badge', label: 'Badge Gambar' },
              { value: 'inline', label: 'Sejajar Judul' },
            ]}
          />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <RangeSliderControl
          label="Ukuran Judul"
          value={card.titleSizePx}
          min={11}
          max={22}
          onChange={(v) => onChange({ titleSizePx: v ?? 13 })}
        />
        <RangeSliderControl
          label="Ukuran Deskripsi"
          value={card.descriptionSizePx}
          min={10}
          max={17}
          onChange={(v) => onChange({ descriptionSizePx: v ?? 12 })}
        />
        {showPriceControls && (
          <RangeSliderControl
            label="Ukuran Harga"
            value={card.priceSizePx}
            min={10}
            max={20}
            onChange={(v) => onChange({ priceSizePx: v ?? 13 })}
          />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#171717]/15">
        <ToggleControl
          label="Tampilkan Label Kategori"
          checked={card.showCategory}
          onChange={(showCategory) => onChange({ showCategory })}
        />
        <ToggleControl
          label="Tampilkan Deskripsi Singkat"
          checked={card.showDescription}
          onChange={(showDescription) => onChange({ showDescription })}
        />
        {showPriceControls && (
          <ToggleControl
            label="Tampilkan Harga / Estimasi"
            checked={card.showPrice}
            onChange={(showPrice) => onChange({ showPrice })}
          />
        )}
        <ToggleControl
          label="Tampilkan Tombol Aksi"
          checked={card.showActionButton}
          onChange={(showActionButton) => onChange({ showActionButton })}
        />
        {showMetaToggle && (
          <ToggleControl
            label="Tampilkan Metadata (Tahun/Tanggal)"
            checked={card.showMeta}
            onChange={(showMeta) => onChange({ showMeta })}
          />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-[#171717]/15">
        <ColorPickerControl
          label="Background Card"
          value={card.backgroundColor}
          onChange={(backgroundColor) => onChange({ backgroundColor })}
        />
        <ColorPickerControl
          label="Warna Teks Card"
          value={card.textColor}
          onChange={(textColor) => onChange({ textColor })}
        />
        <ColorPickerControl
          label="Warna Border Card"
          value={card.borderColor}
          onChange={(borderColor) => onChange({ borderColor })}
        />
        <ColorPickerControl
          label="Warna Aksen / Harga"
          value={card.accentColor}
          onChange={(accentColor) => onChange({ accentColor })}
        />
        <ColorPickerControl
          label="Background Tombol"
          value={card.buttonBg}
          onChange={(buttonBg) => onChange({ buttonBg })}
        />
        <ColorPickerControl
          label="Teks Tombol"
          value={card.buttonText}
          onChange={(buttonText) => onChange({ buttonText })}
        />
      </div>
    </div>
  );
}

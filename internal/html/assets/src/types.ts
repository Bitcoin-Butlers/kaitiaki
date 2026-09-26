// Bitcoin Inheritance Type Definitions
// Shared types for recovery (native JS) and creation (WASM)

// ============================================
// Bundle Types (used by maker.html WASM)
// ============================================

export interface BundleFile {
  name: string;
  data: Uint8Array;
}

export interface GeneratedBundle {
  friendName: string;
  fileName: string;
  data: Uint8Array;
}

export interface BundleCreateResult {
  error?: string;
  bundles?: GeneratedBundle[];
  manifest?: Uint8Array;
  ownerFile?: Uint8Array;
}

export interface ArchiveCreateResult {
  error?: string;
  data?: Uint8Array;
}

export interface BundleFromArchiveConfig {
  projectName: string;
  threshold: number;
  friends: FriendInput[];
  archiveData: Uint8Array;
  version: string;
  defaultLanguage?: string;
  tlockRound?: number;
  tlockUnlock?: string;
  ownerRecipient?: string;
  /**
   * True when the owner left no text at all. Every text they do write is
   * sealed into the archive before bundles are made, so a bundle is given
   * this flag and never the words themselves.
   */
  ownerWroteNothing?: boolean;
}

/**
 * Everything the owner writes. All of it is sealed inside the encrypted
 * archive, so it reaches a reader only when enough guardians combine their
 * pieces. Go decides the filenames and headers, so a bundle made in the
 * browser matches one made by the command line.
 */
export interface SealedTexts {
  peopleAndPlaces?: string;
  recoverySteps?: string;
  chainPayload?: string;
  /** Known only when the owner published BEFORE generating. */
  chainTxid?: string;
}

/** Input for the chain copy an owner publishes. */
export interface ChainCopyConfig {
  descriptor: string;
  recoverySteps?: string;
}

/** What the chain copy costs, worked out from the real payload. */
export interface ChainCopyResult {
  text: string;
  bytes: number;
  vbytes: number;
  satAt2: number;
  satAt10: number;
  format: 'threshold' | 'bip138';
  excluded: string[];
  error: string | null;
}

// ============================================
// Project Types
// ============================================

export interface FriendInfo {
  name: string;
  contact?: string;
  shareIndex: number;  // 1-based share index for this friend
}

export interface FriendInput {
  name: string;
  contact?: string;
  language?: string;
}

export interface ProjectConfig {
  name?: string;
  threshold?: number;
  friends?: FriendInfo[];
}

export interface ProjectParseResult {
  error?: string;
  project?: ProjectConfig;
}

// ============================================
// Personalization Types (for recover.html)
// ============================================

export interface PersonalizationData {
  holder: string;
  holderShare: string;
  threshold: number;
  total: number;
  language?: string;
  manifestB64?: string; // Base64-encoded MANIFEST.age (when small enough to embed)
  ownerB64?: string; // Base64-encoded OWNER.age (always small)
  tlockEnabled?: boolean; // Signals tlock-js is included for time-lock decryption
}

// ============================================
// Tlock Types (for time-lock encryption)
// ============================================

export interface TlockContainerMeta {
  v: number;
  method: string;
  round: number;
  unlock: string;
  chain: string;
}

// ============================================
// UI State Types
// ============================================

// Import ParsedShare from crypto module for recovery state
import type { ParsedShare } from './crypto/share';

export interface RecoveryState {
  shares: (ParsedShare & { isHolder?: boolean })[];
  manifest: Uint8Array | null;
  threshold: number;
  total: number;
  recovering: boolean;
  recoveryComplete: boolean;
  ownerAge: Uint8Array | null;
  decryptedArchive?: Uint8Array;
}

export interface CreationState {
  projectName: string;
  friends: FriendInput[];
  threshold: number;
  files: BundleFile[];
  bundles: GeneratedBundle[];
  wasmReady: boolean;
  generating: boolean;
  generationComplete: boolean;
  tlockEnabled: boolean;
  tlockValue: number;
  tlockUnit: string;
}

// ============================================
// Selfhosted Config (injected by server at render time)
// ============================================

export interface SelfhostedConfig {
  maxManifestSize: number;
  hasManifest: boolean;
  manifestURL?: string;  // URL to fetch manifest from (set by server or static pages)
}

// ============================================
// Toast Types
// ============================================

export type ToastType = 'error' | 'warning' | 'success' | 'info';

export interface ToastAction {
  id: string;
  label: string;
  primary?: boolean;
  onClick?: () => void;
}

export interface ToastOptions {
  type?: ToastType;
  title?: string;
  message: string;
  guidance?: string;
  actions?: ToastAction[];
  duration?: number;
}

// ============================================
// WASM Global Interface (for maker.html)
// ============================================

declare global {
  interface Window {
    // WASM ready flag (used by maker.html)
    inheritanceReady: boolean;
    inheritanceAppReady?: boolean;

    // Creation functions (create.wasm, used by maker.html)
    inheritanceCreateArchive(files: BundleFile[], texts?: SealedTexts): ArchiveCreateResult;
    inheritanceEncryptChainCopy?(config: ChainCopyConfig): ChainCopyResult;
    inheritanceCreateBundlesFromArchive(config: BundleFromArchiveConfig): BundleCreateResult;
    inheritanceParseProjectYAML(yaml: string): ProjectParseResult;

    // Shared utilities (exposed by shared.ts)
    inheritanceUtils: {
      escapeHtml: (str: string | null | undefined) => string;
      formatSize: (bytes: number) => string;
      toast: ToastManager;
      showInlineError: (target: HTMLElement, message: string, guidance?: string) => void;
      clearInlineError: (target: HTMLElement) => void;
    };

    // UI update callback
    inheritanceUpdateUI?: () => void;

    // Personalization data (embedded in recover.html)
    PERSONALIZATION?: PersonalizationData | null;

    // Embedded constants
    WASM_BINARY?: string;
    VERSION?: string;
    BUILD_DATE?: string;
    MAX_TOTAL_FILE_SIZE?: number;

    // Localized README filenames (embedded in recover.html)
    README_NAMES?: string[];

    // Selfhosted mode (only present in selfhosted builds, eliminated in static builds)
    inheritanceLoadManifest?: (data: Uint8Array, name?: string) => void;
    SELFHOSTED_CONFIG?: SelfhostedConfig | null;

    // Go WASM runtime (used by maker.html)
    Go: new () => GoInstance;
  }

  interface GoInstance {
    importObject: WebAssembly.Imports;
    run(instance: WebAssembly.Instance): Promise<void>;
  }
}

// ============================================
// Toast Manager Interface
// ============================================

export interface ToastManager {
  container: HTMLElement | null;
  backdrop: HTMLElement | null;
  errorCount: number;
  init(): void;
  showBackdrop(): void;
  hideBackdrop(): void;
  dismissAllErrors(): void;
  show(options: ToastOptions): HTMLElement;
  dismiss(toastEl: HTMLElement): void;
  error(title: string, message: string, guidance?: string, actions?: ToastAction[]): HTMLElement;
  warning(title: string, message: string, guidance?: string): HTMLElement;
  success(title: string, message: string): HTMLElement;
  info(title: string, message: string, guidance?: string): HTMLElement;
}

// ============================================
// Translation Function Type
// ============================================

export type TranslationFunction = (key: string, ...args: (string | number)[]) => string;

// ============================================
// BarcodeDetector API (not in standard TS lib)
// ============================================

export interface DetectedBarcode {
  rawValue: string;
  format: string;
  boundingBox: DOMRectReadOnly;
  cornerPoints: Array<{ x: number; y: number }>;
}

declare global {
  class BarcodeDetector {
    constructor(options?: { formats: string[] });
    detect(source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap | ImageData): Promise<DetectedBarcode[]>;
    static getSupportedFormats(): Promise<string[]>;
  }
}

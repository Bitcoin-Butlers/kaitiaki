import type {
  CreationState,
  BundleFile,
  GeneratedBundle,
  TranslationFunction,
} from './types';

// Import from tlock-js submodules (not the barrel) to avoid pulling in
// drand-client HTTP code. The barrel re-exports HttpCachingChain/HttpChainClient
// which would bloat the bundle with unused HTTP client code.
import { createTimelockEncrypter } from 'tlock-js/drand/timelock-encrypter';
import { encryptAge } from 'tlock-js/age/age-encrypt-decrypt';
import { Buffer } from 'buffer';
import { createOfflineClient, QUICKNET_GENESIS, QUICKNET_PERIOD, formatTimelockDate } from './drand';

/**
 * The owner's own words, read off the six prompts in step 3.
 *
 * Two texts come out, and they go to different places. The method travels to
 * the chain and into every README, because a lone guardian may safely hold it
 * and an heir with one bundle and one key needs it early. The people and
 * places go only into the encrypted archive, because a README is built to be
 * forwarded: a guardian's own copy tells them to send it to whoever asks.
 *
 * Empty boxes contribute nothing, so an owner who skips step 3 gets exactly
 * the bundle they would have got before it existed.
 */
/**
 * "Anything else" repeats, because the prior art this design follows says any
 * number of such records may be included and an owner rarely has exactly one
 * extra thing to say.
 */

/**
 * Show the owner, once, that they have written nothing for their heirs.
 *
 * It never blocks. A gate on a free tool is satisfied by typing a full stop,
 * and then the heir holds a bundle that passed the check and still says
 * nothing. The bundle itself carries the other half of this: when the boxes
 * are empty the README says so plainly, so an heir knows the gap was a
 * decision rather than a lost file.
 */
function updateEmptyWordsWarning(): void {
  const warning = document.getElementById('empty-words-warning');
  if (!warning) return;
  const { recoverySteps, peopleAndPlaces } = collectOwnersWords();
  warning.classList.toggle('hidden', recoverySteps !== '' || peopleAndPlaces !== '');
}

function wireEmptyWordsWarning(): void {
  const ids = ['words-wallet', 'words-opens', 'words-sign', 'words-keys', 'words-call'];
  for (const id of ids) {
    document.getElementById(id)?.addEventListener('input', updateEmptyWordsWarning);
  }
  document.getElementById('words-else-list')?.addEventListener('input', updateEmptyWordsWarning);
  updateEmptyWordsWarning();
}


/** The chain copy the owner will publish, once they have asked for one. */
let chainCopy: { text: string; bytes: number } | null = null;

/** The transaction id, if the owner published before generating. */
function chainTxid(): string {
  const el = document.getElementById('chain-txid') as HTMLInputElement | null;
  return el?.value.trim() ?? '';
}

/**
 * Wire the destination choice, the descriptor field and the live size.
 *
 * The label on the recovery-steps group changes with the choice. It said "goes
 * on the chain and in the bundles" before this existed, which was a promise
 * the page could not keep for an owner who never asked for a chain copy.
 *
 * The size is worked out from the real payload rather than estimated, so the
 * sat figure is the one the client actually pays. It never blocks: past a
 * point it says the bundles carry the same words for nothing, and leaves the
 * decision where it belongs.
 */
function wireDestination(): void {
  const fields = document.getElementById('chain-fields');
  const descriptor = document.getElementById('chain-descriptor') as HTMLTextAreaElement | null;
  const sizeEl = document.getElementById('chain-size');
  const longEl = document.getElementById('chain-long');
  const pill = document.querySelector('.words-dest-chain');
  if (!fields || !descriptor || !sizeEl || !longEl) return;

  const wantsChain = (): boolean =>
    (document.querySelector('input[name="destination"]:checked') as HTMLInputElement | null)?.value === 'both';

  const refresh = (): void => {
    const on = wantsChain();
    fields.classList.toggle('hidden', !on);
    if (pill) pill.textContent = t(on ? 'words_method_dest' : 'words_method_dest_bundles');

    chainCopy = null;
    sizeEl.textContent = '';
    longEl.classList.add('hidden');
    if (!on || !descriptor.value.trim() || typeof window.rememoryEncryptChainCopy !== 'function') return;

    const { recoverySteps } = collectOwnersWords();
    const result = window.rememoryEncryptChainCopy!({
      descriptor: descriptor.value.trim(),
      recoverySteps,
    });
    if (result.error) {
      sizeEl.textContent = result.error;
      return;
    }
    chainCopy = { text: result.text, bytes: result.bytes };
    sizeEl.textContent = t('chain_size', result.bytes, result.satAt2, result.satAt10);
    longEl.classList.toggle('hidden', result.bytes <= 1500);
  };

  document.querySelectorAll('input[name="destination"]').forEach((el) =>
    el.addEventListener('change', refresh)
  );
  descriptor.addEventListener('input', refresh);
  for (const id of ['words-wallet', 'words-opens', 'words-sign']) {
    document.getElementById(id)?.addEventListener('input', refresh);
  }
  refresh();
}

function wireAddAnother(): void {
  const button = document.getElementById('words-add-another');
  const list = document.getElementById('words-else-list');
  if (!button || !list) return;
  button.addEventListener('click', () => {
    const first = list.querySelector<HTMLTextAreaElement>('.words-else');
    const box = document.createElement('textarea');
    box.className = 'words-else';
    box.rows = 2;
    if (first) box.placeholder = first.placeholder;
    list.appendChild(box);
    box.focus();
  });
}

function collectOwnersWords(): { recoverySteps: string; peopleAndPlaces: string } {
  const read = (id: string): string =>
    (document.getElementById(id) as HTMLTextAreaElement | null)?.value.trim() || '';

  const section = (label: string, body: string): string =>
    body ? `${label}\n${body}\n` : '';

  const recoverySteps = [
    section('The wallet:', read('words-wallet')),
    section('What opens it:', read('words-opens')),
    section('How to sign and send:', read('words-sign')),
  ]
    .filter(Boolean)
    .join('\n')
    .trim();

  const extras = Array.from(document.querySelectorAll<HTMLTextAreaElement>('.words-else'))
    .map((el) => el.value.trim())
    .filter(Boolean);

  const peopleAndPlaces = [
    section('Where each key is:', read('words-keys')),
    section('Who to call first:', read('words-call')),
    extras.length > 0 ? section('Also:', extras.join('\n\n')) : '',
  ]
    .filter(Boolean)
    .join('\n')
    .trim();

  return { recoverySteps, peopleAndPlaces };
}
// Bitcoin Inheritance Bundle Creator - Browser-based bundle creation using Go WASM
// Tlock encryption is inline and offline — it uses the embedded drand chain
// config to encrypt for a future round without any HTTP calls.


// Translation function and language state (defined in HTML)
declare const t: TranslationFunction;
declare let currentLang: string;

// Compile-time flag: esbuild replaces this with true or false.
// When false, guarded code blocks are eliminated entirely from the output.
declare const __SELFHOSTED__: boolean;

(function() {
  'use strict';

  // Import shared utilities
  const { escapeHtml, formatSize, toast } = window.rememoryUtils;

  // Sample names for placeholders
  const sampleNames = [
    'Catalina', 'Matthias', 'Sophie', 'Joaquín', 'Emma',
    'Francisca', 'Liam', 'Hannah', 'Sebastián', 'Olivia'
  ];
  let nameIndex = Math.floor(Math.random() * sampleNames.length);

  function getNextSampleName(): string {
    const name = sampleNames[nameIndex];
    nameIndex = (nameIndex + 1) % sampleNames.length;
    return name;
  }

  function generateProjectName(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `recovery-${year}-${month}-${day}`;
  }

  // Escape special characters in YAML double-quoted strings
  function escapeYamlString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')  // Backslash must be escaped first
      .replace(/"/g, '\\"')     // Escape double quotes
      .replace(/\n/g, '\\n')    // Escape newlines
      .replace(/\r/g, '\\r')    // Escape carriage returns
      .replace(/\t/g, '\\t');   // Escape tabs
  }

  // State
  const state: CreationState = {
    projectName: generateProjectName(),
    friends: [],
    threshold: 2,
    files: [],
    bundles: [],
    wasmReady: false,
    generating: false,
    generationComplete: false,
    tlockEnabled: false,
    tlockValue: 30,
    tlockUnit: 'd' as string,
  };

  // ---------------------------------------------------------------------------
  // The test run
  //
  // An owner who has never seen a recovery has no way to tell a good bundle
  // from a bad one. A test run makes throwaway bundles from a sample file so
  // they can practise, and marks every one of them so a drill can never be
  // mistaken for the real thing.
  //
  // It is an offer and not a gate. A required gate was rejected on the
  // test-recovery ticket, because people fake a gate to get past it.
  // ---------------------------------------------------------------------------

  /** Set once the owner has taken the offer or generated anything. Said once. */
  const TEST_NUDGE_SEEN_KEY = 'inheritance_test_nudge_seen';

  /**
   * Carried into the project name, so it reaches the README, the printed PDF
   * and METADATA.yaml. Those are what a guardian actually reads.
   */
  const TEST_PREFIX = 'TEST';

  let testMode = false;

  /** The throwaway payload. Never the owner's own files. */
  function sampleTestFile(): { name: string; data: Uint8Array } {
    const text = [
      'THIS IS A TEST FILE.',
      '',
      'It stands in for the files you will really protect: a wallet',
      'descriptor, cosigner keys, an estate letter.',
      '',
      'Practise a recovery with the bundles built around it. When you can',
      'get this text back, you know the method works, and you can throw',
      'every test bundle away.',
      '',
      'Nothing here is secret and nothing here is yours.',
      '',
    ].join('\n');
    return {
      name: 'TEST-sample.txt',
      data: new TextEncoder().encode(text),
    };
  }

  function nudgeSeen(): boolean {
    try {
      return localStorage.getItem(TEST_NUDGE_SEEN_KEY) === '1';
    } catch {
      // A browser that refuses storage simply sees the offer again. That is
      // better than hiding it from everyone because one browser said no.
      return false;
    }
  }

  function markNudgeSeen(): void {
    try {
      localStorage.setItem(TEST_NUDGE_SEEN_KEY, '1');
    } catch {
      // Nothing to do. The offer is not important enough to warn about.
    }
  }

  /**
   * The offer, and the way out of it.
   *
   * The offer appears once, for an owner who has never generated anything on
   * this browser. It never blocks the real Generate button beside it.
   */
  function wireTestRun(): void {
    if (!nudgeSeen()) elements.testNudge?.classList.remove('hidden');

    elements.testNudgeBtn?.addEventListener('click', () => {
      markNudgeSeen();
      setTestMode(true);
      elements.testBanner?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    elements.testOffBtn?.addEventListener('click', () => {
      setTestMode(false);
    });
  }

  /**
   * The names the CURRENT set of bundles is saved under, decided once when
   * they are generated.
   *
   * It used to read `testMode` at click time. Generate a test run, turn the
   * test run off, then download: the list still said TEST- and the file saved
   * without it. A test bundle whose filename looks real is exactly the
   * mistake the stamp exists to prevent, so the name is fixed at the moment
   * the bytes are made and never recomputed.
   */
  let bundlesWereStamped = false;

  function downloadNameFor(fileName: string): string {
    return bundlesWereStamped ? `${TEST_PREFIX}-${fileName}` : fileName;
  }

  function setTestMode(on: boolean): void {
    testMode = on;
    elements.testBanner?.classList.toggle('hidden', !on);
    elements.testNudge?.classList.add('hidden');
    document.body.classList.toggle('test-run', on);
  }

  // Selfhosted callback for uploading the manifest after bundle generation.
  // Assigned in the __SELFHOSTED__ block; null in standalone builds.
  let onBundlesCreated: ((manifest: Uint8Array, meta: {
    name: string; threshold: number; total: number;
  }) => Promise<void>) | null = null;

  // DOM elements interface
  interface Elements {
    testNudge: HTMLElement | null;
    testNudgeBtn: HTMLButtonElement | null;
    testBanner: HTMLElement | null;
    testOffBtn: HTMLButtonElement | null;
    wasmLoadingIndicator: HTMLElement | null;
    friendsHint: HTMLElement | null;
    friendsSection: HTMLElement | null;
    importSection: HTMLElement | null;
    yamlImport: HTMLTextAreaElement | null;
    importBtn: HTMLButtonElement | null;
    friendsList: HTMLElement | null;
    addFriendBtn: HTMLButtonElement | null;
    thresholdSelect: HTMLSelectElement | null;
    thresholdSection: HTMLElement | null;
    thresholdGuidance: HTMLElement | null;
    friendsValidation: HTMLElement | null;
    filesDropZone: HTMLElement | null;
    filesInput: HTMLInputElement | null;
    folderInput: HTMLInputElement | null;
    filesPreview: HTMLElement | null;
    filesSummary: HTMLElement | null;
    generateBtn: HTMLButtonElement | null;
    progressBar: HTMLElement | null;
    statusMessage: HTMLElement | null;
    bundlesList: HTMLElement | null;
    downloadAllSection: HTMLElement | null;
    downloadAllBtn: HTMLButtonElement | null;
    downloadYamlBtn: HTMLElement | null;
    stepNumber2: HTMLElement | null;
    stepNumber3: HTMLElement | null;
  }

  // DOM elements
  const elements: Elements = {
    wasmLoadingIndicator: document.getElementById('wasm-loading-indicator'),
    friendsHint: document.getElementById('friends-hint'),
    friendsSection: document.getElementById('friends-section'),
    importSection: document.getElementById('import-section'),
    yamlImport: document.getElementById('yaml-import') as HTMLTextAreaElement | null,
    importBtn: document.getElementById('import-btn') as HTMLButtonElement | null,
    friendsList: document.getElementById('friends-list'),
    addFriendBtn: document.getElementById('add-friend-btn') as HTMLButtonElement | null,
    thresholdSelect: document.getElementById('threshold-select') as HTMLSelectElement | null,
    thresholdSection: document.getElementById('threshold-section'),
    thresholdGuidance: document.getElementById('threshold-guidance'),
    friendsValidation: document.getElementById('friends-validation'),
    filesDropZone: document.getElementById('files-drop-zone'),
    filesInput: document.getElementById('files-input') as HTMLInputElement | null,
    folderInput: document.getElementById('folder-input') as HTMLInputElement | null,
    filesPreview: document.getElementById('files-preview'),
    filesSummary: document.getElementById('files-summary'),
    generateBtn: document.getElementById('generate-btn') as HTMLButtonElement | null,
    testNudge: document.getElementById('test-nudge'),
    testNudgeBtn: document.getElementById('test-nudge-btn') as HTMLButtonElement | null,
    testBanner: document.getElementById('test-banner'),
    testOffBtn: document.getElementById('test-off-btn') as HTMLButtonElement | null,
    progressBar: document.getElementById('progress-bar'),
    statusMessage: document.getElementById('status-message'),
    bundlesList: document.getElementById('bundles-list'),
    downloadAllSection: document.getElementById('download-all-section'),
    downloadAllBtn: document.getElementById('download-all-btn') as HTMLButtonElement | null,
    downloadYamlBtn: document.getElementById('download-yaml-btn'),
    stepNumber2: document.getElementById('step-number-2'),
    stepNumber3: document.getElementById('step-number-3'),
  };

  // ============================================
  // Error Display
  // ============================================

  function showError(msg: string, options: { title?: string; guidance?: string } = {}): void {
    const { title, guidance } = options;
    toast.error(title || t('error_title'), msg, guidance);
  }

  // ============================================
  // Initialization
  // ============================================

  function checkBuildAge(): void {
    const buildDate = window.BUILD_DATE;
    if (!buildDate || buildDate === 'dev' || buildDate === '') return;

    // Don't show on GitHub Pages (always up to date)
    if (window.location.hostname === 'eljojo.github.io') return;

    // Don't show on selfhosted (server operator manages updates)
    if (__SELFHOSTED__) return;

    const built = new Date(buildDate + 'T00:00:00Z');
    if (isNaN(built.getTime())) return;

    const now = new Date();
    const sixMonths = 6 * 30 * 24 * 60 * 60 * 1000; // ~180 days
    if (now.getTime() - built.getTime() < sixMonths) return;

    toast.show({
      type: 'info',
      title: t('update_nudge_title'),
      message: t('update_nudge_message', window.VERSION || 'dev', buildDate),
      duration: 0,
      actions: [{
        id: 'check-updates',
        label: t('update_nudge_action'),
        primary: true,
        onClick: () => window.open('https://github.com/eljojo/rememory/releases/latest', '_blank'),
      }],
    });
  }

  async function init(): Promise<void> {
    checkBuildAge();
    setupImport();
    setupFriends();
    setupFiles();
    setupGenerate();
    setupTimelock();
    wireAddAnother();
    wireEmptyWordsWarning();
    wireDestination();
    wireTestRun();

    // Add initial 2 friends
    addFriend();
    addFriend();
    updateThresholdOptions();

    await waitForWasm();
  }

  async function waitForWasm(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let pollTimer: ReturnType<typeof setTimeout>;
      const timeout = setTimeout(() => {
        clearTimeout(pollTimer);
        reject(new Error('WASM load timed out'));
      }, 15000);
      const check = (): void => {
        if (window.rememoryReady) {
          clearTimeout(timeout);
          state.wasmReady = true;
          // Freeze WASM functions so they can't be intercepted by injected scripts
          if (typeof Object.freeze === 'function') {
            Object.freeze(window.rememoryCreateBundlesFromArchive);
            Object.freeze(window.rememoryCreateArchive);
            Object.freeze(window.rememoryParseProjectYAML);
          }
          elements.wasmLoadingIndicator?.classList.add('hidden');
          checkGenerateReady();
          resolve();
        } else {
          pollTimer = setTimeout(check, 50);
        }
      };
      check();
    });
  }

  // ============================================
  // YAML Import
  // ============================================

  function setupImport(): void {
    elements.importBtn?.addEventListener('click', () => {
      const yaml = elements.yamlImport?.value.trim();
      if (!yaml) return;

      if (!state.wasmReady) {
        toast.warning(t('error_not_ready_title'), t('error_not_ready_message'), t('error_not_ready_guidance'));
        return;
      }

      const result = window.rememoryParseProjectYAML(yaml);
      if (result.error || !result.project) {
        showError(
          t('import_error', result.error || 'Unknown error'),
          {
            title: t('error_import_title'),
            guidance: t('error_import_guidance')
          }
        );
        return;
      }

      // Clear existing friends
      state.friends = [];
      if (elements.friendsList) elements.friendsList.innerHTML = '';

      // Import friends
      const project = result.project;
      if (project.name) {
        state.projectName = project.name;
      }

      if (project.friends && project.friends.length > 0) {
        project.friends.forEach((f: any) => {
          addFriend(f.name, f.contact || '', f.language || '');
        });
      }

      if (project.threshold && project.threshold >= 2) {
        state.threshold = project.threshold;
      }

      updateThresholdOptions();
      if (elements.yamlImport) elements.yamlImport.value = '';
      showStatus(t('import_success', project.friends ? project.friends.length : 0), 'success');
      checkGenerateReady();
    });
  }

  // ============================================
  // Friends Management
  // ============================================

  function setupFriends(): void {
    elements.addFriendBtn?.addEventListener('click', () => addFriend());

    elements.thresholdSelect?.addEventListener('change', () => {
      state.threshold = parseInt(elements.thresholdSelect?.value || '2', 10);
    });
  }

  function addFriend(name = '', contact = '', language = ''): void {
    const index = state.friends.length;
    state.friends.push({ name, contact, language });

    const entry = document.createElement('div');
    entry.className = 'friend-entry';
    entry.dataset.index = String(index);

    const sampleName = getNextSampleName();
    const sampleContact = sampleName.toLowerCase() + '@example.com';

    entry.innerHTML = `
      <div class="friend-number">#${index + 1}</div>
      <div class="field">
        <label class="required">${t('name_label')}</label>
        <input type="text" class="friend-name" value="${escapeHtml(name)}" placeholder="${sampleName}" required>
      </div>
      <div class="field">
        <label>${t('contact_label')}</label>
        <input type="text" class="friend-contact" value="${escapeHtml(contact)}" placeholder="${sampleContact}">
      </div>
      <button type="button" class="remove-btn" title="${t('remove')}">&times;</button>
    `;

    // Add event listeners
    const nameInput = entry.querySelector('.friend-name') as HTMLInputElement;
    nameInput?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      state.friends[index].name = target.value.trim();
      target.classList.remove('input-error');
      updateThresholdVisibility();
      checkGenerateReady();
    });

    const contactInput = entry.querySelector('.friend-contact') as HTMLInputElement;
    contactInput?.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      state.friends[index].contact = target.value.trim();
    });

    const removeBtn = entry.querySelector('.remove-btn');
    removeBtn?.addEventListener('click', () => {
      removeFriend(index);
    });

    elements.friendsList?.appendChild(entry);
    updateThresholdOptions();
    checkGenerateReady();
  }

  function removeFriend(index: number): void {
    if (state.friends.length <= 2) {
      // Can't go below 2 friends — clear the fields instead
      state.friends[index].name = '';
      state.friends[index].contact = '';
      state.friends[index].language = '';
      const entry = elements.friendsList?.children[index] as HTMLElement | undefined;
      if (entry) {
        const nameInput = entry.querySelector('.friend-name') as HTMLInputElement | null;
        const contactInput = entry.querySelector('.friend-contact') as HTMLInputElement | null;
        if (nameInput) nameInput.value = '';
        if (contactInput) contactInput.value = '';
      }
      updateThresholdVisibility();
      checkGenerateReady();
      return;
    }

    state.friends.splice(index, 1);
    renderFriendsList();
    updateThresholdOptions();
    checkGenerateReady();
  }

  function renderFriendsList(): void {
    if (elements.friendsList) elements.friendsList.innerHTML = '';
    const friends = [...state.friends];
    state.friends = [];
    friends.forEach(f => addFriend(f.name, f.contact || '', f.language || ''));
  }
  function updateThresholdOptions(): void {
    const n = state.friends.length;
    const current = state.threshold;

    if (elements.thresholdSelect) {
      elements.thresholdSelect.innerHTML = '';
      for (let k = 2; k <= n; k++) {
        const option = document.createElement('option');
        option.value = String(k);
        option.textContent = t('threshold_option', k, n);
        elements.thresholdSelect.appendChild(option);
      }

      if (current >= 2 && current <= n) {
        elements.thresholdSelect.value = String(current);
        state.threshold = current;
      } else {
        elements.thresholdSelect.value = String(Math.min(2, n));
        state.threshold = Math.min(2, n);
      }
    }

    updateThresholdVisibility();
  }

  function updateThresholdVisibility(): void {
    const show = state.friends.filter(f => f.name.trim().length > 0).length >= 2;
    elements.thresholdSection?.classList.toggle('hidden', !show);
    elements.thresholdGuidance?.classList.toggle('hidden', !show);
  }

  // ============================================
  // Files Handling
  // ============================================

  function setupFiles(): void {
    elements.filesDropZone?.addEventListener('click', () => {
      if (elements.folderInput && 'webkitdirectory' in elements.folderInput) {
        elements.folderInput.click();
      } else {
        elements.filesInput?.click();
      }
    });

    elements.filesDropZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      elements.filesDropZone?.classList.add('dragover');
    });

    elements.filesDropZone?.addEventListener('dragleave', () => {
      elements.filesDropZone?.classList.remove('dragover');
    });

    elements.filesDropZone?.addEventListener('drop', async (e) => {
      e.preventDefault();
      elements.filesDropZone?.classList.remove('dragover');

      const items = e.dataTransfer?.items;
      if (items && items.length > 0) {
        const files: { file: File; path: string }[] = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.kind === 'file') {
            const entry = item.webkitGetAsEntry?.();
            if (entry) {
              await traverseFileTree(entry, '', files);
            } else {
              const file = item.getAsFile();
              if (file) {
                files.push({ file, path: file.name });
              }
            }
          }
        }
        await loadFiles(files);
      }
    });

    elements.filesInput?.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const fileList = Array.from(target.files || []);
      const files = fileList.map(f => ({ file: f, path: f.name }));
      target.value = '';
      await loadFiles(files);
    });

    elements.folderInput?.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const fileList = Array.from(target.files || []);
      const files = fileList.map(f => ({
        file: f,
        path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name
      }));
      target.value = '';
      await loadFiles(files);
    });
  }

  async function traverseFileTree(
    entry: FileSystemEntry,
    basePath: string,
    files: { file: File; path: string }[]
  ): Promise<void> {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File>((resolve) => fileEntry.file(resolve));
      const path = basePath ? `${basePath}/${entry.name}` : entry.name;
      files.push({ file, path });
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const dirReader = dirEntry.createReader();
      const entries = await new Promise<FileSystemEntry[]>((resolve) => {
        dirReader.readEntries(resolve);
      });
      const newBasePath = basePath ? `${basePath}/${entry.name}` : entry.name;
      for (const childEntry of entries) {
        await traverseFileTree(childEntry, newBasePath, files);
      }
    }
  }

  async function loadFiles(filesWithPaths: { file: File; path: string }[]): Promise<void> {
    // Clear any file-related errors
    elements.filesDropZone?.classList.remove('has-error');
    const existingFilesError = elements.filesDropZone?.parentNode?.querySelector('.inline-error');
    existingFilesError?.remove();

    const existingPaths = new Set(state.files.map(f => f.name));

    for (const { file, path } of filesWithPaths) {
      // Skip hidden files
      if (path.split('/').some(part => part.startsWith('.'))) {
        continue;
      }

      // Skip duplicates
      if (existingPaths.has(path)) {
        continue;
      }

      const buffer = await readFileAsArrayBuffer(file);
      state.files.push({
        name: path,
        data: new Uint8Array(buffer)
      });
      existingPaths.add(path);
    }

    renderFilesPreview();
    checkGenerateReady();
  }

  function renderFilesPreview(): void {
    elements.filesDropZone?.classList.toggle('loaded', state.files.length > 0);

    if (state.files.length === 0) {
      elements.filesPreview?.classList.add('hidden');
      elements.filesSummary?.classList.add('hidden');
      return;
    }

    if (elements.filesPreview) elements.filesPreview.innerHTML = '';
    let totalSize = 0;

    state.files.forEach((file, index) => {
      totalSize += file.data.length;
      const item = document.createElement('div');
      item.className = 'file-item';
      item.innerHTML = `
        <span class="icon">&#128196;</span>
        <span class="name">${escapeHtml(file.name)}</span>
        <span class="size">${formatSize(file.data.length)}</span>
        <button type="button" class="file-remove-btn" data-index="${index}" title="${t('remove')}">&times;</button>
      `;
      const removeBtn = item.querySelector('.file-remove-btn');
      removeBtn?.addEventListener('click', () => {
        removeFile(index);
      });
      elements.filesPreview?.appendChild(item);
    });

    elements.filesPreview?.classList.remove('hidden');
    if (elements.filesSummary) {
      let summaryText = t('files_summary', state.files.length, formatSize(totalSize));
      const overLimit = totalSize > maxTotalFileSize;

      if (overLimit) {
        summaryText += `. ${t('files_too_large', formatSize(maxTotalFileSize))}`;
      }

      elements.filesSummary.textContent = summaryText;
      elements.filesSummary.classList.toggle('size-warning', overLimit);
    }
    elements.filesSummary?.classList.remove('hidden');
  }

  function removeFile(index: number): void {
    state.files.splice(index, 1);
    renderFilesPreview();
    checkGenerateReady();
  }

  // ============================================
  // Bundle Generation
  // ============================================

  function setupGenerate(): void {
    elements.generateBtn?.addEventListener('click', generateBundles);
    elements.downloadAllBtn?.addEventListener('click', downloadAllBundles);
    elements.downloadYamlBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      downloadProjectYaml();
    });
  }

  // ============================================
  // Time Lock (Advanced Options)
  //
  // Tlock encryption is inline — no separate tlock-create.js bundle.
  // Uses createOfflineClient() which reads only the embedded drand config,
  // so encryption makes zero HTTP calls.
  // ============================================

  // Compute the round number for a target date
  function roundForTime(target: Date): number {
    const elapsed = (target.getTime() / 1000) - QUICKNET_GENESIS;
    if (elapsed <= 0) return 1;
    return Math.ceil(elapsed / QUICKNET_PERIOD) + 1;
  }

  // Compute the time at which a round will be emitted
  function timeForRound(round: number): Date {
    if (round <= 1) return new Date(QUICKNET_GENESIS * 1000);
    const timestamp = QUICKNET_GENESIS + (round - 1) * QUICKNET_PERIOD;
    return new Date(timestamp * 1000);
  }

  // Encrypt plaintext for a specific round number (offline — no HTTP).
  // Returns raw age binary (not armored).
  async function tlockEncrypt(plaintext: Uint8Array, roundNumber: number): Promise<Uint8Array> {
    const client = createOfflineClient();
    const encrypter = createTimelockEncrypter(client, roundNumber);
    const raw = await encryptAge(Buffer.from(plaintext), encrypter);
    return Buffer.from(raw, 'binary');
  }

  // Encrypt plaintext for a target date, returning everything the caller needs.
  async function encryptForDate(plaintext: Uint8Array, targetDate: Date): Promise<{
    ciphertext: Uint8Array;
    round: number;
    unlockDate: Date;
  }> {
    const round = roundForTime(targetDate);
    const ciphertext = await tlockEncrypt(plaintext, round);
    const unlockDate = timeForRound(round);
    return { ciphertext, round, unlockDate };
  }

  // Compute a future date from a duration value and unit (e.g. 5, 'min' → 5 minutes from now).
  // Maximum timelock duration: 2 years. The League of Entropy beacon is
  // reliable infrastructure, but we can't responsibly promise it will run
  // longer than that. The CLI has no cap for advanced users who accept the risk.
  const MAX_TIMELOCK_MS = 2 * 365.25 * 86400000;

  function computeTimelockDate(value: number, unit: string): Date | null {
    if (value <= 0) return null;
    const now = new Date();
    let target: Date;
    switch (unit) {
      case 's': target = new Date(now.getTime() + value * 1000); break;
      case 'min': target = new Date(now.getTime() + value * 60000); break;
      case 'h': target = new Date(now.getTime() + value * 3600000); break;
      case 'd': target = new Date(now.getTime() + value * 86400000); break;
      case 'w': target = new Date(now.getTime() + value * 7 * 86400000); break;
      case 'm': { target = new Date(now); target.setMonth(target.getMonth() + value); break; }
      case 'y': { target = new Date(now); target.setFullYear(target.getFullYear() + value); break; }
      default: return null;
    }
    if (target.getTime() - now.getTime() > MAX_TIMELOCK_MS) return null;
    return target;
  }

  function setupTimelock(): void {
    const advancedTabs = document.getElementById('advanced-options');
    advancedTabs?.classList.remove('hidden');

    const tlockPanel = document.getElementById('timelock-panel');
    const tlockDetails = document.getElementById('timelock-details');
    const checkbox = document.getElementById('timelock-checkbox') as HTMLInputElement | null;
    const optionsDiv = document.getElementById('timelock-options');
    const valueInput = document.getElementById('timelock-value') as HTMLInputElement | null;
    const unitSelect = document.getElementById('timelock-unit') as HTMLSelectElement | null;
    const datePreview = document.getElementById('timelock-date-preview');

    // Simple/Advanced tab switching
    advancedTabs?.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        advancedTabs.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const mode = (tab as HTMLElement).dataset.mode;
        tlockPanel?.classList.toggle('hidden', mode !== 'advanced');
        if (mode !== 'advanced') {
          // Reset tlock when switching back to simple
          if (checkbox) checkbox.checked = false;
          state.tlockEnabled = false;
          optionsDiv?.classList.add('hidden');
          tlockDetails?.classList.add('hidden');
          updateTimelockPreview();
        }
      });
    });

    checkbox?.addEventListener('change', () => {
      state.tlockEnabled = checkbox.checked;
      optionsDiv?.classList.toggle('hidden', !checkbox.checked);
      tlockDetails?.classList.toggle('hidden', !checkbox.checked);
      updateTimelockPreview();
    });

    valueInput?.addEventListener('input', () => {
      state.tlockValue = parseInt(valueInput.value, 10) || 1;
      updateTimelockPreview();
    });

    unitSelect?.addEventListener('change', () => {
      state.tlockUnit = unitSelect.value;
      updateTimelockPreview();
    });

    function updateTimelockPreview(): void {
      if (!datePreview || !state.tlockEnabled) {
        if (datePreview) datePreview.textContent = '';
        return;
      }
      const target = computeTimelockDate(state.tlockValue, state.tlockUnit);
      if (target) {
        datePreview.textContent = t('timelock_preview', formatTimelockDate(target));
        datePreview.style.color = '';
      } else if (state.tlockValue > 0) {
        datePreview.textContent = t('timelock_max_exceeded');
        datePreview.style.color = '#8A8480';
      }
    }

  }

  // Maximum total file size — injected by Go from core.MaxTotalSize (standalone)
  // or the server's configured limit (selfhosted).
  const maxTotalFileSize = window.MAX_TOTAL_FILE_SIZE ?? 1024 * 1024 * 1024;

  function getTotalFileSize(): number {
    let total = 0;
    for (const file of state.files) {
      total += file.data.length;
    }
    return total;
  }

  function isOverSizeLimit(): boolean {
    return state.files.length > 0 && getTotalFileSize() > maxTotalFileSize;
  }

  function checkGenerateReady(): void {
    const hasFiles = state.files.length > 0;
    const hasFriends = state.friends.filter(f => f.name.trim().length > 0).length >= 2;

    if (elements.generateBtn) {
      elements.generateBtn.disabled = !state.wasmReady || state.generating || isOverSizeLimit();

      // Button turns green only when files and friends are ready
      if (hasFiles && hasFriends && !state.generationComplete) {
        elements.generateBtn.classList.replace('btn-secondary', 'btn-primary');
      } else {
        elements.generateBtn.classList.replace('btn-primary', 'btn-secondary');
      }
    }

    // Step numbers turn green as prerequisites are met
    elements.stepNumber2?.classList.toggle('pending', !hasFriends);
    elements.stepNumber3?.classList.toggle('pending', !(hasFiles && hasFriends));
  }

  interface ValidationResult {
    valid: boolean;
    errors: string[];
    firstInvalidElement: HTMLElement | null;
  }

  function validateInputs(silent = false): boolean {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      firstInvalidElement: null
    };

    // Clear previous inline errors
    document.querySelectorAll('.friend-entry').forEach(entry => {
      entry.querySelectorAll('input').forEach(input => {
        input.classList.remove('input-error');
      });
      const existingError = entry.querySelector('.field-error');
      existingError?.remove();
    });
    elements.filesDropZone?.classList.remove('has-error');
    const existingFilesError = elements.filesDropZone?.parentNode?.querySelector('.inline-error');
    existingFilesError?.remove();

    if (state.friends.length < 2) {
      result.valid = false;
      if (!silent) result.errors.push(t('validation_min_friends'));
    } else {
      state.friends.forEach((f, i) => {
        const entry = elements.friendsList?.children[i] as HTMLElement | undefined;
        if (!entry) return;

        if (!f.name) {
          result.valid = false;
          if (!silent) {
            result.errors.push(t('validation_friend_name', i + 1));
            const nameInput = entry.querySelector('.friend-name') as HTMLInputElement;
            nameInput?.classList.add('input-error');
            if (!result.firstInvalidElement) result.firstInvalidElement = nameInput;
          }
        }
      });
    }

    // Files validation. A test run brings its own sample file, so asking the
    // owner for theirs would make the practice run harder than the real one.
    if (!testMode && state.files.length === 0) {
      result.valid = false;
      if (!silent) {
        result.errors.push(t('validation_no_files'));
        elements.filesDropZone?.classList.add('has-error');
        if (!result.firstInvalidElement && elements.filesDropZone) {
          result.firstInvalidElement = elements.filesDropZone;
        }
      }
    }

    if (!silent && result.errors.length > 0) {
      if (elements.friendsValidation) {
        elements.friendsValidation.textContent = result.errors.join('. ');
        elements.friendsValidation.classList.remove('hidden');
      }

      // Focus first invalid element
      if (result.firstInvalidElement) {
        result.firstInvalidElement.focus();
        result.firstInvalidElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // Show validation toast
      toast.warning(
        t('validation_title'),
        t('validation_message'),
        t('validation_guidance')
      );
    } else {
      elements.friendsValidation?.classList.add('hidden');
    }

    return result.valid;
  }

  async function generateBundles(): Promise<void> {
    if (!validateInputs(false)) return;
    if (!state.wasmReady) return;
    if (state.generating) return;

    state.generating = true;
    state.generationComplete = false;
    state.bundles = [];

    if (elements.generateBtn) {
      elements.generateBtn.disabled = true;
      elements.generateBtn.classList.replace('btn-secondary', 'btn-primary');
    }
    elements.progressBar?.classList.remove('hidden');
    elements.bundlesList?.classList.add('hidden');
    elements.downloadAllSection?.classList.add('hidden');
    if (elements.statusMessage) elements.statusMessage.className = 'status-message';

    try {
      setProgress(0);
      setStatus(t('generating'));
      // Whether this run is a test or the real thing, the offer has served
      // its purpose and must not be repeated.
      markNudgeSeen();
      elements.testNudge?.classList.add('hidden');
      // Fix the stamp to what this run is, before any of it is generated.
      bundlesWereStamped = testMode;

      // A test run never carries the owner's own files. If it did, a
      // throwaway bundle would hold real secrets and could not be thrown away.
      const filesForWasm: BundleFile[] = testMode
        ? [sampleTestFile()]
        : state.files.map(f => ({
            name: f.name,
            data: f.data
          }));

      // The stamp. It rides on the project name, which is what the README,
      // the printed PDF and METADATA.yaml all print, so a guardian holding a
      // test bundle sees it before anything else.
      const projectName = testMode
        ? `${TEST_PREFIX} ${state.projectName}`
        : state.projectName;

      const friends = state.friends.map(f => ({
        name: f.name,
        contact: f.contact || '',
        language: f.language || ''
      }));

      // Step 1: Create archive
      setProgress(10);
      setStatus(t('archiving'));
      await sleep(100);

      const ownersWords = collectOwnersWords();

      // Every text the owner writes goes INSIDE the archive, so it opens only
      // when enough guardians combine. Go names each file and writes its
      // header, so a bundle made here matches one made by the command line.
      const archiveResult = window.rememoryCreateArchive(filesForWasm, {
        // Where the keys are is the most sensitive thing an owner writes. It
        // does not go into a bundle they are about to throw away.
        peopleAndPlaces: testMode ? undefined : ownersWords.peopleAndPlaces || undefined,
        recoverySteps: ownersWords.recoverySteps || undefined,
        chainPayload: chainCopy?.text || undefined,
        // Published before generating, so the id can go inside. An owner who
        // publishes later cannot add it: the archive is encrypted and its key
        // is already split. Their estate page carries it instead.
        chainTxid: chainTxid() || undefined,
      });
      if (archiveResult.error || !archiveResult.data) {
        throw new Error(archiveResult.error || 'Failed to create archive');
      }

      // Step 2: Optionally tlock-encrypt
      let archiveData = archiveResult.data;
      let tlockRound: number | undefined;
      let tlockUnlock: string | undefined;

      if (state.tlockEnabled) {
        setProgress(25);
        setStatus(t('timelock_encrypting'));
        await sleep(100);

        const targetDate = computeTimelockDate(state.tlockValue, state.tlockUnit);
        if (!targetDate) throw new Error(t('timelock_max_exceeded'));
        const result = await encryptForDate(archiveData, targetDate);
        archiveData = result.ciphertext;
        tlockRound = result.round;
        tlockUnlock = result.unlockDate.toISOString();
      }

      // Step 3: Age-encrypt, split, and bundle
      setProgress(50);
      setStatus(t('encrypting'));
      await sleep(100);

      setProgress(65);
      setStatus(t('splitting'));
      await sleep(100);

      // Owner recipient validation is Go's ValidateOwnerRecipient (one
      // source of truth); an invalid value fails bundle creation loudly.
      const ownerInput = document.getElementById('owner-recipient') as HTMLInputElement | null;
      const ownerRecipient = ownerInput?.value.trim() || undefined;

      const result = window.rememoryCreateBundlesFromArchive({
        projectName: projectName,
        threshold: state.threshold,
        friends: friends,
        archiveData: archiveData,
        version: window.VERSION || 'dev',
        defaultLanguage: currentLang || 'en',
        tlockRound: tlockRound,
        tlockUnlock: tlockUnlock,
        ownerRecipient: ownerRecipient,
        // The words themselves are already sealed in the archive above. A
        // bundle is told only whether there were any, so its README can say
        // so and can never print them.
        ownerWroteNothing:
          ownersWords.recoverySteps === '' && !chainCopy?.text,
      });

      if (result.error || !result.bundles) {
        throw new Error(result.error || 'Failed to create bundles');
      }

      setProgress(80);

      state.bundles = result.bundles;

      // Expose bundles for testing
      (window as unknown as { rememoryBundles?: GeneratedBundle[] }).rememoryBundles = result.bundles;

      renderBundlesList();

      setProgress(100);
      setStatus(t('complete'), 'success');
      state.generationComplete = true;
      if (elements.generateBtn) {
        elements.generateBtn.classList.replace('btn-primary', 'btn-secondary');
      }

      elements.bundlesList?.classList.remove('hidden');
      elements.downloadAllSection?.classList.remove('hidden');

      const ownerBtn = document.getElementById('download-owner-btn');
      const ownerSep = document.getElementById('owner-download-sep');
      if (result.ownerFile && ownerBtn && ownerSep) {
        const ownerData = result.ownerFile;
        ownerBtn.classList.remove('hidden');
        ownerSep.classList.remove('hidden');
        ownerBtn.onclick = (e) => {
          e.preventDefault();
          const blob = new Blob([ownerData as BlobPart], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'OWNER.age';
          a.click();
          URL.revokeObjectURL(url);
        };
      }

      if (__SELFHOSTED__) {
        // Upload manifest to server (shares are never sent)
        if (result.manifest && onBundlesCreated) {
          onBundlesCreated(result.manifest, {
            name: state.projectName,
            threshold: state.threshold,
            total: friends.length,
          });
        }

        // Replace "Save project.yml" with a home page link
        const nextStepsHint = document.querySelector('.next-steps-hint');
        if (nextStepsHint) {
          const yamlLink = nextStepsHint.querySelector('#download-yaml-btn');
          if (yamlLink) {
            const prev = yamlLink.previousSibling;
            if (prev && prev.nodeType === Node.TEXT_NODE) prev.remove();
            yamlLink.remove();
          }

          const sep = document.createTextNode(' \u00b7 ');
          const link = document.createElement('a');
          link.href = '/';
          link.textContent = t('go_to_home');
          nextStepsHint.appendChild(sep);
          nextStepsHint.appendChild(link);
        }
      }

    } catch (err) {
      const errorMsg = (err instanceof Error) ? err.message : String(err);
      setStatus(t('error', errorMsg), 'error');

      toast.error(
        t('error_generate_title'),
        errorMsg,
        t('error_generate_guidance'),
        [
          { id: 'retry', label: t('action_try_again'), primary: true, onClick: () => generateBundles() }
        ]
      );
    } finally {
      state.generating = false;
      checkGenerateReady();
    }
  }

  function renderBundlesList(): void {
    if (elements.bundlesList) elements.bundlesList.innerHTML = '';

    state.bundles.forEach((bundle, index) => {
      const item = document.createElement('div');
      item.className = 'bundle-item ready';
      item.innerHTML = `
        <span class="icon">&#128230;</span>
        <div class="details">
          <div class="name">${t('bundle_for', escapeHtml(bundle.friendName))}</div>
          <div class="meta">${escapeHtml(downloadNameFor(bundle.fileName))} (${formatSize(bundle.data.length)})</div>
        </div>
        <button type="button" class="download-btn" data-index="${index}">${t('download')}</button>
      `;

      const downloadBtn = item.querySelector('.download-btn');
      downloadBtn?.addEventListener('click', () => {
        downloadBundle(bundle);
      });

      elements.bundlesList?.appendChild(item);
    });
  }

  function downloadBundle(bundle: GeneratedBundle): void {
    const blob = new Blob([bundle.data as BlobPart], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadNameFor(bundle.fileName);
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadAllBundles(): void {
    state.bundles.forEach((bundle, index) => {
      setTimeout(() => downloadBundle(bundle), index * 500);
    });
  }

  function downloadProjectYaml(): void {
    let yaml = `# Bitcoin Inheritance Project Configuration\n`;
    yaml += `# Generated: ${new Date().toISOString()}\n`;
    yaml += `# Import this file to quickly restore your friend list\n\n`;
    yaml += `name: ${state.projectName}\n`;
    yaml += `threshold: ${state.threshold}\n`;
    if (currentLang && currentLang !== 'en') {
      yaml += `language: ${currentLang}\n`;
    }
    yaml += `friends:\n`;

    state.friends.forEach(f => {
      yaml += `  - name: "${escapeYamlString(f.name)}"\n`;
      if (f.contact) {
        yaml += `    contact: "${escapeYamlString(f.contact)}"\n`;
      }
      if (f.language) {
        yaml += `    language: ${f.language}\n`;
      }
    });

    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.yml';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ============================================
  // UI Helpers
  // ============================================

  function setProgress(percent: number): void {
    const fill = elements.progressBar?.querySelector('.fill') as HTMLElement | null;
    if (fill) {
      fill.style.width = percent + '%';
    }
  }

  function setStatus(msg: string, type?: string): void {
    if (elements.statusMessage) {
      elements.statusMessage.textContent = msg;
      elements.statusMessage.className = 'status-message' + (type ? ' ' + type : '');
    }
  }

  function showStatus(msg: string, type?: string): void {
    setStatus(msg, type);
    if (type === 'success') {
      setTimeout(() => {
        if (elements.statusMessage?.textContent === msg) {
          elements.statusMessage.textContent = '';
        }
      }, 3000);
    }
  }

  // ============================================
  // Utility Functions
  // ============================================

  function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================
  // Selfhosted Server Integration
  //
  // Everything inside `if (__SELFHOSTED__)` is eliminated from static builds
  // by esbuild's dead code removal (--define:__SELFHOSTED__=false --minify-syntax).
  // ============================================

  if (__SELFHOSTED__) {
    const selfhostedConfig = window.SELFHOSTED_CONFIG;

    // Register the callback that fires after bundle generation.
    // Receives only the encrypted manifest and non-secret metadata — never bundles/shares.
    onBundlesCreated = async function(manifest: Uint8Array, meta: {
      name: string;
      threshold: number;
      total: number;
    }): Promise<void> {
      if (selfhostedConfig && manifest.length > selfhostedConfig.maxManifestSize) {
        toast.error(
          t('error_title'),
          t('files_too_large', formatSize(selfhostedConfig.maxManifestSize)),
        );
        return;
      }

      try {
        const formData = new FormData();
        formData.append('manifest', new Blob([manifest as unknown as BlobPart]), 'MANIFEST.age');
        formData.append('meta', JSON.stringify(meta));

        const resp = await fetch('/api/bundle', {
          method: 'POST',
          body: formData,
        });

        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || `Server returned ${resp.status}`);
        }

        toast.success(t('complete'), t('saved_to_server'));
      } catch (err) {
        const msg = (err instanceof Error) ? err.message : String(err);
        toast.warning(t('error_title'), t('save_to_server_error', msg));
      }
    };
  }

  // ============================================
  // Global Exports
  // ============================================

  window.rememoryUpdateUI = function(): void {
    renderFriendsList();
    renderFilesPreview();
    if (state.generationComplete) {
      renderBundlesList();
    }
  };

  // Start
  document.addEventListener('DOMContentLoaded', init);
})();

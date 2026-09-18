import { CustomTopologyStickyNote, CustomTopologyMap, StickyNoteColor } from '../types';

export const CUSTOM_MAPS_STORAGE_KEY = 'nettopology_custom_maps_v2';

export interface DeviceNoteData {
  id: string;
  title: string;
  content: string;
  color: StickyNoteColor;
  updatedAt: string;
  createdAt: string;
  mapId: string;
  mapName: string;
}

/**
 * Load all custom maps safely from localStorage.
 */
export function getCustomMaps(): CustomTopologyMap[] {
  try {
    const raw = localStorage.getItem(CUSTOM_MAPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error loading custom maps for device notes:', e);
    return [];
  }
}

/**
 * Save custom maps to localStorage and broadcast change event.
 */
export function saveCustomMaps(maps: CustomTopologyMap[]): void {
  try {
    localStorage.setItem(CUSTOM_MAPS_STORAGE_KEY, JSON.stringify(maps));
    
    // Sync with backend API if token is available
    const token =
      localStorage.getItem('nettopology_auth_token_v1') ||
      sessionStorage.getItem('nettopology_auth_token_v1');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch('/api/settings/maps', {
      method: 'POST',
      headers,
      body: JSON.stringify({ maps }),
    }).catch(() => {});

    // Dispatch a window event so all components update immediately
    window.dispatchEvent(new CustomEvent('nettopology_sticky_notes_updated', { detail: { maps } }));
  } catch (e) {
    console.error('Error saving custom maps for device notes:', e);
  }
}

/**
 * Get all sticky notes associated with a given device ID across all custom maps.
 */
export function getNotesForDevice(deviceId: string): DeviceNoteData[] {
  if (!deviceId) return [];
  const maps = getCustomMaps();
  const notes: DeviceNoteData[] = [];
  const cleanDevId = deviceId.replace(/^hw-/, '');

  for (const map of maps) {
    if (!map.stickyNotes || !Array.isArray(map.stickyNotes)) continue;
    for (const note of map.stickyNotes) {
      if (note.linkedDeviceId) {
        const cleanLinked = note.linkedDeviceId.replace(/^hw-/, '');
        if (cleanLinked === cleanDevId || note.linkedDeviceId === deviceId) {
          notes.push({
            id: note.id,
            title: note.title || '',
            content: note.content || '',
            color: note.color || 'yellow',
            updatedAt: note.updatedAt || note.createdAt || new Date().toISOString(),
            createdAt: note.createdAt || new Date().toISOString(),
            mapId: map.id,
            mapName: map.name || (map.id === 'default' ? 'Default Topology' : 'Custom Map'),
          });
        }
      }
    }
  }

  // Sort notes newest first
  return notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/**
 * Check whether a device has any linked sticky notes.
 */
export function hasNotesForDevice(deviceId: string): boolean {
  if (!deviceId) return false;
  const maps = getCustomMaps();
  const cleanDevId = deviceId.replace(/^hw-/, '');

  for (const map of maps) {
    if (!map.stickyNotes || !Array.isArray(map.stickyNotes)) continue;
    const found = map.stickyNotes.some((n) => {
      if (!n.linkedDeviceId) return false;
      const cleanLinked = n.linkedDeviceId.replace(/^hw-/, '');
      return cleanLinked === cleanDevId || n.linkedDeviceId === deviceId;
    });
    if (found) return true;
  }
  return false;
}

/**
 * Add a new sticky note linked to a device.
 * If targetMapId is provided, attaches to that map; otherwise attaches to the active/first map.
 * Ensures the note is created with proper coordinates near the device if the device is already on the map,
 * or placed prominently on the canvas so it will be connected once the device is added.
 */
export function addNoteToDevice(
  deviceId: string,
  noteData: { title?: string; content: string; color?: StickyNoteColor; targetMapId?: string }
): CustomTopologyStickyNote {
  const maps = getCustomMaps();
  const targetMapId = noteData.targetMapId || maps[0]?.id || 'default';

  let targetMap = maps.find((m) => m.id === targetMapId);
  if (!targetMap) {
    // Create a fallback default map if no maps exist yet
    targetMap = {
      id: targetMapId,
      name: 'Default Topology',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      devicePositions: {},
      deviceIds: [],
      links: [],
      stickyNotes: [],
    };
    maps.push(targetMap);
  }

  // Determine note position: if device position exists, place slightly offset to top-right
  const devPos = targetMap.devicePositions?.[deviceId];
  const posX = devPos ? devPos.x + 180 : 300 + Math.floor(Math.random() * 80);
  const posY = devPos ? devPos.y - 60 : 200 + Math.floor(Math.random() * 80);

  const now = new Date().toISOString();
  const newNote: CustomTopologyStickyNote = {
    id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    x: posX,
    y: posY,
    width: 230,
    title: noteData.title || '',
    content: noteData.content || '',
    color: noteData.color || 'yellow',
    linkedDeviceId: deviceId,
    createdAt: now,
    updatedAt: now,
    viewMode: 'card',
  };

  const updatedMaps = maps.map((m) => {
    if (m.id === targetMap!.id) {
      return {
        ...m,
        stickyNotes: [...(m.stickyNotes || []), newNote],
        updatedAt: now,
      };
    }
    return m;
  });

  saveCustomMaps(updatedMaps);
  return newNote;
}

/**
 * Update an existing sticky note by noteId and mapId.
 */
export function updateNoteForDevice(
  noteId: string,
  mapId: string,
  updates: Partial<Pick<CustomTopologyStickyNote, 'title' | 'content' | 'color'>>
): void {
  const maps = getCustomMaps();
  const now = new Date().toISOString();

  const updatedMaps = maps.map((m) => {
    if (m.id === mapId && m.stickyNotes) {
      return {
        ...m,
        stickyNotes: m.stickyNotes.map((n) =>
          n.id === noteId ? { ...n, ...updates, updatedAt: now } : n
        ),
        updatedAt: now,
      };
    }
    return m;
  });

  saveCustomMaps(updatedMaps);
}

/**
 * Delete a sticky note by noteId and mapId.
 */
export function deleteNoteForDevice(noteId: string, mapId: string): void {
  const maps = getCustomMaps();
  const now = new Date().toISOString();

  const updatedMaps = maps.map((m) => {
    if (m.id === mapId && m.stickyNotes) {
      return {
        ...m,
        stickyNotes: m.stickyNotes.filter((n) => n.id !== noteId),
        updatedAt: now,
      };
    }
    return m;
  });

  saveCustomMaps(updatedMaps);
}

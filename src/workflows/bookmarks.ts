/**
 * Leak Bookmarking Module
 * Allow users to bookmark and organize leaks for follow-up
 */

import { RevenueLeak, LeakType, LeakSeverity } from '../types';
import { generateId } from '../utils/helpers';

export interface Bookmark {
  id: string;
  leakId: string;
  userId: string;
  portalId: string;
  createdAt: Date;
  tags: string[];
  notes?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reminder?: Date;
  status: 'active' | 'snoozed' | 'completed' | 'dismissed';
  folder?: string;
}

export interface BookmarkFolder {
  id: string;
  name: string;
  userId: string;
  color?: string;
  icon?: string;
  bookmarkCount: number;
  createdAt: Date;
}

export interface BookmarkFilter {
  userId?: string;
  portalId?: string;
  tags?: string[];
  priority?: Bookmark['priority'][];
  status?: Bookmark['status'][];
  folder?: string;
  hasReminder?: boolean;
  reminderBefore?: Date;
}

export interface BookmarkStats {
  total: number;
  byPriority: Record<Bookmark['priority'], number>;
  byStatus: Record<Bookmark['status'], number>;
  byFolder: Map<string, number>;
  withReminders: number;
  totalPotentialRevenue: number;
}

export class LeakBookmarkManager {
  private bookmarks: Map<string, Bookmark> = new Map();
  private folders: Map<string, BookmarkFolder> = new Map();
  private leakCache: Map<string, RevenueLeak> = new Map();

  /**
   * Create a bookmark for a leak
   */
  createBookmark(
    leak: RevenueLeak,
    userId: string,
    portalId: string,
    options: Partial<Omit<Bookmark, 'id' | 'leakId' | 'userId' | 'portalId' | 'createdAt'>> = {}
  ): Bookmark {
    const bookmark: Bookmark = {
      id: generateId(),
      leakId: leak.id,
      userId,
      portalId,
      createdAt: new Date(),
      tags: options.tags || [],
      notes: options.notes,
      priority: options.priority || this.suggestPriority(leak),
      reminder: options.reminder,
      status: options.status || 'active',
      folder: options.folder,
    };

    this.bookmarks.set(bookmark.id, bookmark);
    this.leakCache.set(leak.id, leak);

    // Update folder count
    if (bookmark.folder) {
      const folder = this.folders.get(bookmark.folder);
      if (folder) {
        folder.bookmarkCount++;
      }
    }

    return bookmark;
  }

  /**
   * Get a bookmark by ID
   */
  getBookmark(bookmarkId: string): Bookmark | undefined {
    return this.bookmarks.get(bookmarkId);
  }

  /**
   * Get bookmark by leak ID for a user
   */
  getBookmarkByLeak(leakId: string, userId: string): Bookmark | undefined {
    for (const bookmark of this.bookmarks.values()) {
      if (bookmark.leakId === leakId && bookmark.userId === userId) {
        return bookmark;
      }
    }
    return undefined;
  }

  /**
   * Update a bookmark
   */
  updateBookmark(
    bookmarkId: string,
    updates: Partial<Omit<Bookmark, 'id' | 'leakId' | 'userId' | 'portalId' | 'createdAt'>>
  ): Bookmark | undefined {
    const bookmark = this.bookmarks.get(bookmarkId);
    if (!bookmark) return undefined;

    // Handle folder change
    if (updates.folder !== undefined && updates.folder !== bookmark.folder) {
      // Decrement old folder count
      if (bookmark.folder) {
        const oldFolder = this.folders.get(bookmark.folder);
        if (oldFolder) {
          oldFolder.bookmarkCount--;
        }
      }
      // Increment new folder count
      if (updates.folder) {
        const newFolder = this.folders.get(updates.folder);
        if (newFolder) {
          newFolder.bookmarkCount++;
        }
      }
    }

    Object.assign(bookmark, updates);
    return bookmark;
  }

  /**
   * Delete a bookmark
   */
  deleteBookmark(bookmarkId: string): boolean {
    const bookmark = this.bookmarks.get(bookmarkId);
    if (!bookmark) return false;

    // Update folder count
    if (bookmark.folder) {
      const folder = this.folders.get(bookmark.folder);
      if (folder) {
        folder.bookmarkCount--;
      }
    }

    return this.bookmarks.delete(bookmarkId);
  }

  /**
   * Get all bookmarks for a user
   */
  getUserBookmarks(userId: string): Bookmark[] {
    return Array.from(this.bookmarks.values()).filter(b => b.userId === userId);
  }

  /**
   * Get bookmarks with filters
   */
  getBookmarks(filter: BookmarkFilter): Bookmark[] {
    let results = Array.from(this.bookmarks.values());

    if (filter.userId) {
      results = results.filter(b => b.userId === filter.userId);
    }

    if (filter.portalId) {
      results = results.filter(b => b.portalId === filter.portalId);
    }

    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(b => 
        filter.tags!.some(tag => b.tags.includes(tag))
      );
    }

    if (filter.priority && filter.priority.length > 0) {
      results = results.filter(b => filter.priority!.includes(b.priority));
    }

    if (filter.status && filter.status.length > 0) {
      results = results.filter(b => filter.status!.includes(b.status));
    }

    if (filter.folder !== undefined) {
      results = results.filter(b => b.folder === filter.folder);
    }

    if (filter.hasReminder !== undefined) {
      results = results.filter(b => 
        filter.hasReminder ? b.reminder !== undefined : b.reminder === undefined
      );
    }

    if (filter.reminderBefore) {
      results = results.filter(b => 
        b.reminder && b.reminder <= filter.reminderBefore!
      );
    }

    return results;
  }

  /**
   * Create a folder
   */
  createFolder(
    name: string,
    userId: string,
    options: { color?: string; icon?: string } = {}
  ): BookmarkFolder {
    const folder: BookmarkFolder = {
      id: generateId(),
      name,
      userId,
      color: options.color,
      icon: options.icon,
      bookmarkCount: 0,
      createdAt: new Date(),
    };

    this.folders.set(folder.id, folder);
    return folder;
  }

  /**
   * Get user's folders
   */
  getUserFolders(userId: string): BookmarkFolder[] {
    return Array.from(this.folders.values()).filter(f => f.userId === userId);
  }

  /**
   * Delete a folder (moves bookmarks to no folder)
   */
  deleteFolder(folderId: string): boolean {
    const folder = this.folders.get(folderId);
    if (!folder) return false;

    // Move bookmarks out of folder
    for (const bookmark of this.bookmarks.values()) {
      if (bookmark.folder === folderId) {
        bookmark.folder = undefined;
      }
    }

    return this.folders.delete(folderId);
  }

  /**
   * Add tag to bookmark
   */
  addTag(bookmarkId: string, tag: string): boolean {
    const bookmark = this.bookmarks.get(bookmarkId);
    if (!bookmark) return false;

    if (!bookmark.tags.includes(tag)) {
      bookmark.tags.push(tag);
    }
    return true;
  }

  /**
   * Remove tag from bookmark
   */
  removeTag(bookmarkId: string, tag: string): boolean {
    const bookmark = this.bookmarks.get(bookmarkId);
    if (!bookmark) return false;

    bookmark.tags = bookmark.tags.filter(t => t !== tag);
    return true;
  }

  /**
   * Set reminder for bookmark
   */
  setReminder(bookmarkId: string, reminderDate: Date): boolean {
    const bookmark = this.bookmarks.get(bookmarkId);
    if (!bookmark) return false;

    bookmark.reminder = reminderDate;
    return true;
  }

  /**
   * Clear reminder
   */
  clearReminder(bookmarkId: string): boolean {
    const bookmark = this.bookmarks.get(bookmarkId);
    if (!bookmark) return false;

    bookmark.reminder = undefined;
    return true;
  }

  /**
   * Snooze bookmark until a date
   */
  snoozeBookmark(bookmarkId: string, until: Date): boolean {
    const bookmark = this.bookmarks.get(bookmarkId);
    if (!bookmark) return false;

    bookmark.status = 'snoozed';
    bookmark.reminder = until;
    return true;
  }

  /**
   * Mark bookmark as completed
   */
  completeBookmark(bookmarkId: string): boolean {
    const bookmark = this.bookmarks.get(bookmarkId);
    if (!bookmark) return false;

    bookmark.status = 'completed';
    return true;
  }

  /**
   * Dismiss bookmark
   */
  dismissBookmark(bookmarkId: string): boolean {
    const bookmark = this.bookmarks.get(bookmarkId);
    if (!bookmark) return false;

    bookmark.status = 'dismissed';
    return true;
  }

  /**
   * Get due reminders
   */
  getDueReminders(userId?: string): Array<{ bookmark: Bookmark; leak?: RevenueLeak }> {
    const now = new Date();
    let bookmarks = Array.from(this.bookmarks.values()).filter(b => 
      b.reminder && b.reminder <= now && b.status !== 'completed' && b.status !== 'dismissed'
    );

    if (userId) {
      bookmarks = bookmarks.filter(b => b.userId === userId);
    }

    return bookmarks.map(bookmark => ({
      bookmark,
      leak: this.leakCache.get(bookmark.leakId),
    }));
  }

  /**
   * Get bookmark statistics
   */
  getStats(userId?: string): BookmarkStats {
    let bookmarks = Array.from(this.bookmarks.values());
    
    if (userId) {
      bookmarks = bookmarks.filter(b => b.userId === userId);
    }

    const byPriority: Record<Bookmark['priority'], number> = {
      low: 0, medium: 0, high: 0, urgent: 0,
    };

    const byStatus: Record<Bookmark['status'], number> = {
      active: 0, snoozed: 0, completed: 0, dismissed: 0,
    };

    const byFolder = new Map<string, number>();
    let withReminders = 0;
    let totalPotentialRevenue = 0;

    for (const bookmark of bookmarks) {
      byPriority[bookmark.priority]++;
      byStatus[bookmark.status]++;
      
      if (bookmark.folder) {
        byFolder.set(bookmark.folder, (byFolder.get(bookmark.folder) || 0) + 1);
      }
      
      if (bookmark.reminder) {
        withReminders++;
      }

      const leak = this.leakCache.get(bookmark.leakId);
      if (leak) {
        totalPotentialRevenue += leak.potentialRevenue;
      }
    }

    return {
      total: bookmarks.length,
      byPriority,
      byStatus,
      byFolder,
      withReminders,
      totalPotentialRevenue,
    };
  }

  /**
   * Suggest priority based on leak
   */
  private suggestPriority(leak: RevenueLeak): Bookmark['priority'] {
    if (leak.severity === 'critical' || leak.potentialRevenue >= 50000) {
      return 'urgent';
    }
    if (leak.severity === 'high' || leak.potentialRevenue >= 20000) {
      return 'high';
    }
    if (leak.severity === 'medium' || leak.potentialRevenue >= 5000) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Get all unique tags used by a user
   */
  getUserTags(userId: string): string[] {
    const tags = new Set<string>();
    
    for (const bookmark of this.bookmarks.values()) {
      if (bookmark.userId === userId) {
        for (const tag of bookmark.tags) {
          tags.add(tag);
        }
      }
    }
    
    return Array.from(tags).sort();
  }

  /**
   * Bulk update bookmarks
   */
  bulkUpdate(
    bookmarkIds: string[],
    updates: Partial<Pick<Bookmark, 'status' | 'priority' | 'folder'>>
  ): number {
    let updated = 0;
    
    for (const id of bookmarkIds) {
      if (this.updateBookmark(id, updates)) {
        updated++;
      }
    }
    
    return updated;
  }

  /**
   * Export bookmarks
   */
  exportBookmarks(userId: string): object {
    const bookmarks = this.getUserBookmarks(userId);
    const folders = this.getUserFolders(userId);
    
    return {
      bookmarks: bookmarks.map(b => ({
        ...b,
        leak: this.leakCache.get(b.leakId),
      })),
      folders,
      stats: this.getStats(userId),
    };
  }
}

export default LeakBookmarkManager;

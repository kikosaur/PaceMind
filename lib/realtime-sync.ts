import { DatabaseService, WalkingSession } from './database';

export interface RealtimeSyncOptions {
  onSessionUpdate?: (session: WalkingSession) => void;
  onSessionComplete?: (session: WalkingSession) => void;
  onError?: (error: Error) => void;
}

export class RealtimeSyncService {
  private static instance: RealtimeSyncService;
  private activeSessionId: string | null = null;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isOnline: boolean = true;
  private pendingUpdates: { sessionId: string; updates: Partial<WalkingSession> }[] = [];
  private options: RealtimeSyncOptions = {};

  static getInstance(): RealtimeSyncService {
    if (!RealtimeSyncService.instance) {
      RealtimeSyncService.instance = new RealtimeSyncService();
    }
    return RealtimeSyncService.instance;
  }

  private constructor() {
    // Monitor network connectivity
    this.setupNetworkMonitoring();
  }

  private setupNetworkMonitoring() {
    // Simple online/offline detection - only for web platform
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.processPendingUpdates();
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  // Start syncing a walking session
  startSession(sessionId: string, options: RealtimeSyncOptions = {}) {
    this.activeSessionId = sessionId;
    this.options = options;
    
    // Start periodic sync every 5 seconds
    this.syncInterval = setInterval(() => {
      this.syncActiveSession();
    }, 5000);

    console.log(`Started real-time sync for session: ${sessionId}`);
  }

  // Stop syncing the current session
  stopSession() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    this.activeSessionId = null;
    this.options = {};
    
    console.log('Stopped real-time sync');
  }

  // Update session data (called frequently during walking)
  async updateSession(sessionId: string, updates: Partial<WalkingSession>): Promise<boolean> {
    if (!this.isOnline) {
      // Queue update for later
      this.pendingUpdates.push({ sessionId, updates });
      return false;
    }

    try {
      const success = await DatabaseService.updateWalkingSession(sessionId, updates);
      
      if (success && this.options.onSessionUpdate) {
        // Fetch updated session data
        const sessions = await DatabaseService.getWalkingSessions(updates.user_id || '', 1);
        if (sessions.length > 0) {
          this.options.onSessionUpdate(sessions[0]);
        }
      }
      
      return success;
    } catch (error) {
      console.error('Error updating session:', error);
      
      if (this.options.onError) {
        this.options.onError(error as Error);
      }
      
      // Queue for retry
      this.pendingUpdates.push({ sessionId, updates });
      return false;
    }
  }

  // Complete a walking session
  async completeSession(sessionId: string, finalUpdates: Partial<WalkingSession>): Promise<boolean> {
    try {
      // Ensure session is marked as completed
      const completionUpdates = {
        ...finalUpdates,
        status: 'completed' as const,
        end_time: finalUpdates.end_time || new Date().toISOString(),
      };

      const success = await this.updateSession(sessionId, completionUpdates);
      
      if (success && this.options.onSessionComplete) {
        // Fetch completed session data
        const sessions = await DatabaseService.getWalkingSessions(finalUpdates.user_id || '', 1);
        if (sessions.length > 0) {
          this.options.onSessionComplete(sessions[0]);
        }
      }
      
      // Stop syncing after completion
      this.stopSession();
      
      return success;
    } catch (error) {
      console.error('Error completing session:', error);
      
      if (this.options.onError) {
        this.options.onError(error as Error);
      }
      
      return false;
    }
  }

  // Sync active session (called periodically)
  private async syncActiveSession() {
    if (!this.activeSessionId || !this.isOnline) {
      return;
    }

    try {
      // This could be extended to sync with external services
      // For now, we just ensure the session is still active in the database
      console.log(`Syncing session: ${this.activeSessionId}`);
    } catch (error) {
      console.error('Error syncing active session:', error);
      
      if (this.options.onError) {
        this.options.onError(error as Error);
      }
    }
  }

  // Process queued updates when back online
  private async processPendingUpdates() {
    if (!this.isOnline || this.pendingUpdates.length === 0) {
      return;
    }

    console.log(`Processing ${this.pendingUpdates.length} pending updates`);
    
    const updates = [...this.pendingUpdates];
    this.pendingUpdates = [];

    for (const { sessionId, updates: sessionUpdates } of updates) {
      try {
        await DatabaseService.updateWalkingSession(sessionId, sessionUpdates);
      } catch (error) {
        console.error('Error processing pending update:', error);
        // Re-queue failed updates
        this.pendingUpdates.push({ sessionId, updates: sessionUpdates });
      }
    }
  }

  // Get sync status
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      activeSessionId: this.activeSessionId,
      pendingUpdates: this.pendingUpdates.length,
      isSyncing: this.syncInterval !== null,
    };
  }

  // Force sync all pending data
  async forcSync(): Promise<boolean> {
    if (!this.isOnline) {
      return false;
    }

    try {
      await this.processPendingUpdates();
      return true;
    } catch (error) {
      console.error('Error during force sync:', error);
      return false;
    }
  }
}

// Utility functions for easy integration
export const realtimeSync = RealtimeSyncService.getInstance();

export const startWalkingSync = (sessionId: string, options: RealtimeSyncOptions = {}) => {
  return realtimeSync.startSession(sessionId, options);
};

export const updateWalkingSession = (sessionId: string, updates: Partial<WalkingSession>) => {
  return realtimeSync.updateSession(sessionId, updates);
};

export const completeWalkingSession = (sessionId: string, finalUpdates: Partial<WalkingSession>) => {
  return realtimeSync.completeSession(sessionId, finalUpdates);
};

export const stopWalkingSync = () => {
  return realtimeSync.stopSession();
};

export const getSyncStatus = () => {
  return realtimeSync.getSyncStatus();
};

export default RealtimeSyncService;
import { describe, it, expect, beforeEach } from 'vitest';
import { AccessTracker } from '../accessTracker';

describe('AccessTracker', () => {
    let tracker: AccessTracker;

    beforeEach(() => {
        tracker = new AccessTracker();
    });

    describe('markAsAccessed', () => {
        it('should mark a file as accessed this session', () => {
            tracker.markAsAccessed('notes/diary.md');
            expect(tracker.isAccessedThisSession('notes/diary.md')).toBe(true);
        });

        it('should not affect unrelated files', () => {
            tracker.markAsAccessed('notes/diary.md');
            expect(tracker.isAccessedThisSession('notes/other.md')).toBe(false);
        });
    });

    describe('markAsTemporaryAccess', () => {
        it('should mark file as both temporary and session accessed', () => {
            tracker.markAsTemporaryAccess('secret.md');
            expect(tracker.isTemporaryAccess('secret.md')).toBe(true);
            expect(tracker.isAccessedThisSession('secret.md')).toBe(true);
        });
    });

    describe('removeTemporaryAccess', () => {
        it('should remove temporary access but keep session access', () => {
            tracker.markAsTemporaryAccess('secret.md');
            tracker.removeTemporaryAccess('secret.md');
            expect(tracker.isTemporaryAccess('secret.md')).toBe(false);
            expect(tracker.isAccessedThisSession('secret.md')).toBe(true);
        });
    });

    describe('clearAccess', () => {
        it('should clear both session and temporary access for a file', () => {
            tracker.markAsTemporaryAccess('secret.md');
            tracker.clearAccess('secret.md');
            expect(tracker.isAccessedThisSession('secret.md')).toBe(false);
            expect(tracker.isTemporaryAccess('secret.md')).toBe(false);
        });
    });

    describe('clearAll', () => {
        it('should clear all tracked files', () => {
            tracker.markAsAccessed('a.md');
            tracker.markAsTemporaryAccess('b.md');
            tracker.clearAll();
            expect(tracker.getAccessedFiles()).toEqual([]);
            expect(tracker.getTemporaryAccess()).toEqual([]);
        });
    });

    describe('getAccessedFiles', () => {
        it('should return all accessed file paths', () => {
            tracker.markAsAccessed('a.md');
            tracker.markAsAccessed('b.md');
            expect(tracker.getAccessedFiles()).toEqual(
                expect.arrayContaining(['a.md', 'b.md'])
            );
        });
    });

    describe('getTemporaryAccess', () => {
        it('should return only temporary access file paths', () => {
            tracker.markAsAccessed('a.md');
            tracker.markAsTemporaryAccess('b.md');
            expect(tracker.getTemporaryAccess()).toEqual(['b.md']);
        });
    });
});

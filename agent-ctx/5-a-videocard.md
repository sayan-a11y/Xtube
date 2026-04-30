# Task 5-a: VideoCard Component

## Summary
Built the `VideoCard` component at `/home/z/my-project/src/components/xtube/VideoCard.tsx`.

## Key Decisions
- Video element is lazily created only when `isPreviewPlaying` becomes true (after 800ms hover delay)
- On mouse leave, video is fully destroyed (src removed, load() called) to free resources
- Desktop-only hover preview gated by `window.innerWidth >= 768` check in `handleMouseEnter`
- Uses `useCallback` for all event handlers to prevent unnecessary re-renders
- Cleanup effect on unmount clears timeouts and destroys video

## Dependencies
- `useAppStore` for `openPlayer` action
- `lucide-react` for `Play` and `Clock` icons
- React hooks: `useState`, `useRef`, `useCallback`, `useEffect`

## File Modified
- Created: `src/components/xtube/VideoCard.tsx`
- Updated: `worklog.md` (appended task record)

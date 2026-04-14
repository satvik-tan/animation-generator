I have a React + Tailwind app called Manimation (AI animation generator). 
Here's what needs to be fixed — prioritize these in order:

## LANDING PAGE FIXES

1. **Hero font** — replace the monospace/pixel font with font-sans (Inter or Geist). 
   Keep it bold (font-black), but modern. The retro font looks cheap.

2. **Feature cards** — the icon area is showing empty orange squares (broken). 
   Replace with actual Lucide React icons:
   - Fast Generation → <Zap />
   - Iterate & Refine → <RefreshCw />
   - Error Handling → <ShieldCheck />
   - Custom Keys → <Key />
   Add icon inside a rounded bg-orange-500/10 p-3 container.

3. **Section headers** — "FEATURES", "HOW IT WORKS" etc. — 
   change from all-caps small tracking-widest style to 
   text-2xl font-bold text-white, left-aligned with a small 
   orange underline accent (w-12 h-1 bg-orange-500 mt-2).

4. **CTA button** — add rounded-lg, keep orange, reduce padding slightly, 
   add hover:bg-orange-400 transition.

## APP PAGE FIXES

5. **Refine panel layout** — the middle of this panel is dead empty space. 
   Move the textarea + send button to the TOP of this panel, 
   not the bottom. Make the textarea at least 120px tall with 
   proper placeholder text. Remove the large empty center area.

6. **Gemini/Groq toggle** — replace the two separate buttons with a 
   proper segmented control:
   <div className="flex bg-zinc-800 rounded-lg p-1">
     <button className="flex-1 py-1.5 rounded-md text-sm ...">Gemini</button>
     <button className="flex-1 py-1.5 rounded-md text-sm bg-orange-500 ...">Groq</button>
   </div>

7. **History sidebar items** — add hover:bg-zinc-800 transition, 
   truncate long text with text-ellipsis, and add a small 
   text-zinc-500 text-xs timestamp or status badge below each item.

8. **Animation Preview panel** — remove the double-border awkwardness. 
   Use a single rounded-xl border border-zinc-700 card, 
   with "Animation Preview" as a text-sm text-zinc-400 label 
   inside the card header, not floating above it.

9. **Global** — audit all gap/padding. Use consistent gap-4 or gap-6 
   between sections. Nothing should have ad-hoc margin values.

## PERFORMANCE FIX

10. **Sidebar history caching** — the history list is being fetched fresh 
    from the API on every navigation, causing a 3-4s blank sidebar on 
    every mount. Fix this with React Query:

    Install: npm install @tanstack/react-query

    Replace the current useEffect + fetch pattern in the sidebar with:
    
    const { data: history } = useQuery({
      queryKey: ['history'],
      queryFn: fetchHistory,
      staleTime: 1000 * 60 * 5, // cache is fresh for 5 mins
    });

    When a new animation completes, invalidate the cache instead of 
    refetching the whole list:

    queryClient.invalidateQueries({ queryKey: ['history'] });

    Also add a skeleton loader (animate-pulse, bg-zinc-800 rounded bars) 
    so the very first load has a proper loading state instead of 
    a blank sidebar.

Do NOT touch any API calls, state logic, or routing unless explicitly 
mentioned above. Only JSX, Tailwind classes, and the React Query migration.
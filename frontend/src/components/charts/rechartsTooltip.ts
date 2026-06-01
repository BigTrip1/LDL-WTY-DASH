/** Shared Recharts tooltip props so hovers render above cards and grid peers. */
export const RECHARTS_TOOLTIP_PROPS = {
  wrapperStyle: { zIndex: 10000, outline: 'none', pointerEvents: 'none' as const },
  contentStyle: { zIndex: 10000 }
};

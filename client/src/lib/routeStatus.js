export const ROUTE_STATUS_LABEL = {
  zaplanowana: 'Zaplanowana',
  w_realizacji: 'W realizacji',
  zakonczona: 'Zakończona',
  anulowana: 'Anulowana',
};

export const ROUTE_STATUS_LIST = ['zaplanowana', 'w_realizacji', 'zakonczona', 'anulowana'];

export const ROUTE_STATUS_COLOR = {
  zaplanowana: '#3b82f6',   // blue
  w_realizacji: '#eab308',  // yellow
  zakonczona: '#22c55e',    // green
  anulowana: '#94a3b8',     // slate
};

// Dozwolone przejścia statusów (zgodnie z backendem)
export const ROUTE_STATUS_TRANSITIONS = {
  zaplanowana: ['w_realizacji', 'anulowana'],
  w_realizacji: ['zakonczona', 'anulowana'],
  zakonczona: [],
  anulowana: [],
};

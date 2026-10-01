import { Club, ResolutionConfig, MatchEvent, MatchStats, ChatMessage, LivePoll, ExclusiveContent, StandingTeam } from '../types/football';

export const RESOLUTIONS: ResolutionConfig[] = [
  { id: '1080p60', label: '1080p 60fps', bitrate: '6.0 Mbps', fps: 60, qualityBadge: 'Full HD' },
  { id: '720p60', label: '720p 60fps', bitrate: '3.5 Mbps', fps: 60, qualityBadge: 'HD' },
  { id: '480p', label: '480p', bitrate: '1.5 Mbps', fps: 30, qualityBadge: 'SD' },
  { id: '360p', label: '360p', bitrate: '800 Kbps', fps: 30, qualityBadge: 'Móvil' },
  { id: 'auto', label: 'Automático', bitrate: 'Dinámico', fps: 60, qualityBadge: 'Auto' },
];

export const BOLIVIAN_CLUBS: Record<string, Club> = {
  bolivar: {
    id: 'bolivar',
    name: 'Club Bolívar',
    shortName: 'Bolívar',
    city: 'La Paz',
    primaryColor: '#0284c7', // Sky blue / Celeste
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    badgeEmoji: '⚡',
    stadium: 'Estadio Hernando Siles',
    altitudeMeters: 3637,
  },
  strongest: {
    id: 'strongest',
    name: 'The Strongest',
    shortName: 'Strongest',
    city: 'La Paz',
    primaryColor: '#eab308', // Yellow gold
    secondaryColor: '#0f172a', // Black
    textColor: '#0f172a',
    badgeEmoji: '🐯',
    stadium: 'Estadio Rafael Mendoza Castellón / Siles',
    altitudeMeters: 3637,
  },
  wilstermann: {
    id: 'wilstermann',
    name: 'C.A. Jorge Wilstermann',
    shortName: 'Wilstermann',
    city: 'Cochabamba',
    primaryColor: '#dc2626', // Red
    secondaryColor: '#1e3a8a', // Blue
    textColor: '#ffffff',
    badgeEmoji: '✈️',
    stadium: 'Estadio Félix Capriles',
    altitudeMeters: 2558,
  },
  oriente: {
    id: 'oriente',
    name: 'Oriente Petrolero',
    shortName: 'Oriente',
    city: 'Santa Cruz',
    primaryColor: '#16a34a', // Emerald Green
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    badgeEmoji: '🛢️',
    stadium: 'Estadio Ramón Tahuichi Aguilera',
    altitudeMeters: 416,
  },
  blooming: {
    id: 'blooming',
    name: 'Club Blooming',
    shortName: 'Blooming',
    city: 'Santa Cruz',
    primaryColor: '#38bdf8', // Light blue
    secondaryColor: '#1e3a8a',
    textColor: '#ffffff',
    badgeEmoji: '🦅',
    stadium: 'Estadio Ramón Tahuichi Aguilera',
    altitudeMeters: 416,
  },
  always: {
    id: 'always',
    name: 'Always Ready',
    shortName: 'Always Ready',
    city: 'El Alto',
    primaryColor: '#e11d48', // Red band
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    badgeEmoji: '🔴',
    stadium: 'Estadio Municipal de Villa Ingenio',
    altitudeMeters: 4083,
  },
  nacional: {
    id: 'nacional',
    name: 'Nacional Potosí',
    shortName: 'Nacional Potosí',
    city: 'Potosí',
    primaryColor: '#991b1b',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    badgeEmoji: '🎸',
    stadium: 'Estadio Víctor Agustín Ugarte',
    altitudeMeters: 3900,
  },
  aurora: {
    id: 'aurora',
    name: 'Club Aurora',
    shortName: 'Aurora',
    city: 'Cochabamba',
    primaryColor: '#0284c7',
    secondaryColor: '#ffffff',
    textColor: '#ffffff',
    badgeEmoji: '⭐',
    stadium: 'Estadio Félix Capriles',
    altitudeMeters: 2558,
  }
};

export const INITIAL_MATCH_STATS: MatchStats = {
  possession: [56, 44],
  shots: [15, 9],
  shotsOnTarget: [7, 4],
  corners: [6, 3],
  fouls: [11, 14],
  yellowCards: [2, 3],
  redCards: [0, 0],
  offsides: [2, 1],
  passes: [412, 318],
  passAccuracy: [86, 80],
};

export const INITIAL_EVENTS: MatchEvent[] = [
  {
    id: 'ev-1',
    minute: 14,
    type: 'goal',
    clubId: 'strongest',
    player: 'Michael Ortega',
    description: '¡GOLAZO del Tigre! Remate potente de media distancia que vence la resistencia del portero.',
    scoreAfter: '0 - 1'
  },
  {
    id: 'ev-2',
    minute: 27,
    type: 'yellow_card',
    clubId: 'strongest',
    player: 'Luciano Ursino',
    description: 'Infracción táctica en el centro del campo para cortar la contra celeste.',
  },
  {
    id: 'ev-3',
    minute: 39,
    type: 'goal',
    clubId: 'bolivar',
    player: 'Ramiro Vaca',
    description: '¡GOOOL de Bolívar! Tiro libre magistral al ángulo superior izquierdo imposible de atajar.',
    scoreAfter: '1 - 1'
  },
  {
    id: 'ev-4',
    minute: 54,
    type: 'substitution',
    clubId: 'bolivar',
    player: 'Patricio Rodríguez',
    description: 'Ingresa "El Patito" Rodríguez para desbordar por la banda izquierda.',
  },
  {
    id: 'ev-5',
    minute: 68,
    type: 'var',
    clubId: 'bolivar',
    description: 'Revisión VAR por posible mano en el área de The Strongest. El árbitro decreta penal.',
  },
  {
    id: 'ev-6',
    minute: 71,
    type: 'goal',
    clubId: 'bolivar',
    player: 'Bruno Sávio',
    description: '¡GOOOOOL de Bolívar! Ejecución perfecta desde el punto penal cruzando el remate.',
    scoreAfter: '2 - 1'
  },
  {
    id: 'ev-7',
    minute: 76,
    type: 'yellow_card',
    clubId: 'bolivar',
    player: 'Leonel Justiniano',
    description: 'Tarjeta amarilla por disputa vehemente en el círculo central.',
  }
];

export const INITIAL_CHAT: ChatMessage[] = [
  {
    id: 'c1',
    sender: 'Gonzalo Cobo (Relator Oficial)',
    clubId: 'bolivar',
    text: '¡Bienvenidos a la transmisión oficial del Clásico 234 del fútbol boliviano desde el Hernando Siles!',
    timestamp: '19:42',
    isOfficialRelator: true
  },
  {
    id: 'c2',
    sender: 'Marcelo_LaPaz',
    clubId: 'bolivar',
    text: '¡Vamos Academia de mi vida! Hoy nos quedamos con la punta de la División Profesional 🩵⚡',
    timestamp: '19:43',
    isVip: true
  },
  {
    id: 'c3',
    sender: 'TigreCentenario',
    clubId: 'strongest',
    text: '¡Con garra atigrada se gana este clásico carajo! 💛🖤 A meter presión arriba',
    timestamp: '19:44'
  },
  {
    id: 'c4',
    sender: 'Carlos_Cochabamba',
    clubId: 'wilstermann',
    text: 'Viendo el clásico paceño desde Cocha. Gran nivel de ambos equipos, la cancha está impecable.',
    timestamp: '19:45'
  },
  {
    id: 'c5',
    sender: 'SocioVIP_Paceño',
    clubId: 'bolivar',
    text: '¡Tremendo golazo de Ramiro Vaca! Apoyando con Bs. 50 para el streaming del club 🇧🇴🔥',
    timestamp: '19:46',
    superChatAmount: 50,
    isVip: true
  },
  {
    id: 'c6',
    sender: 'OrientePasion',
    clubId: 'oriente',
    text: 'La transmisión en 1080p60 se ve perfecta sin corte en Santa Cruz. ¡Saludos a toda la hinchada!',
    timestamp: '19:47'
  }
];

export const INITIAL_POLL: LivePoll = {
  id: 'poll-clasico-1',
  question: '¿Quién se consagra en este Clásico Paceño?',
  options: [
    { id: 'opt-bolivar', text: 'Bolívar (Celeste)', votes: 842 },
    { id: 'opt-strongest', text: 'The Strongest (Tigre)', votes: 719 },
    { id: 'opt-draw', text: 'Empate electrizante', votes: 198 },
  ],
  totalVotes: 1759,
};

export const EXCLUSIVE_ITEMS: ExclusiveContent[] = [
  {
    id: 'ex-1',
    title: 'Camerinos Bolívar: Arenga del Capitán y Charla Táctica de Flavio Robatto',
    clubId: 'bolivar',
    category: 'camerino',
    duration: '14:20 min',
    views: 8940,
    isLocked: true,
    tag: 'Acceso Exclusivo Socios',
    description: 'Momentos íntimos en el vestuario del Hernando Siles antes de saltar al campo para el clásico paceño.'
  },
  {
    id: 'ex-2',
    title: 'Entrenamiento a 4.083m en Villa Ingenio: Preparación Física y Táctica de Always Ready',
    clubId: 'always',
    category: 'entrenamiento',
    duration: '22:15 min',
    views: 6410,
    isLocked: false,
    tag: 'Abierto al Público',
    description: 'Tomas aéreas con dron y ejercicios de definición a máxima altitud en El Alto.'
  },
  {
    id: 'ex-3',
    title: 'Conferencia de Prensa en Vivo: Post-partido The Strongest vs Bolívar',
    clubId: 'strongest',
    category: 'prensa',
    duration: 'Live Feed',
    views: 12400,
    isLocked: false,
    tag: 'Transmisión Oficial',
    description: 'Declaraciones sin filtro de los entrenadores y las figuras del encuentro.'
  },
  {
    id: 'ex-4',
    title: 'Mano a Mano Exclusivo: La Historia del "Patito" Rodríguez en el Fútbol Boliviano',
    clubId: 'bolivar',
    category: 'entrevista',
    duration: '28:40 min',
    views: 15200,
    isLocked: true,
    tag: 'Especial VIP',
    description: 'Entrevista íntima repasando sus mejores gambetas, la Libertadores y el amor por los hinchas.'
  },
  {
    id: 'ex-5',
    title: 'Cámara Táctica Detrás de Arco: Repeticiones en Ultra Slow-Motion 120fps',
    clubId: 'bolivar',
    category: 'camerino',
    duration: 'En Directo',
    views: 4500,
    isLocked: true,
    tag: 'Cámara Multi-Ángulo',
    description: 'Perspectiva exclusiva de arqueros y atajadas claves vista ras de césped.'
  }
];

export const STANDINGS_DATA: StandingTeam[] = [
  { position: 1, clubId: 'bolivar', name: 'Bolívar', played: 22, won: 15, drawn: 4, lost: 3, goalDiff: 28, points: 49 },
  { position: 2, clubId: 'strongest', name: 'The Strongest', played: 22, won: 14, drawn: 5, lost: 3, goalDiff: 24, points: 47 },
  { position: 3, clubId: 'always', name: 'Always Ready', played: 22, won: 12, drawn: 6, lost: 4, goalDiff: 15, points: 42 },
  { position: 4, clubId: 'wilstermann', name: 'Jorge Wilstermann', played: 22, won: 10, drawn: 7, lost: 5, goalDiff: 8, points: 37 },
  { position: 5, clubId: 'blooming', name: 'Blooming', played: 22, won: 10, drawn: 4, lost: 8, goalDiff: 4, points: 34 },
  { position: 6, clubId: 'aurora', name: 'Aurora', played: 22, won: 9, drawn: 6, lost: 7, goalDiff: 2, points: 33 },
  { position: 7, clubId: 'oriente', name: 'Oriente Petrolero', played: 22, won: 8, drawn: 5, lost: 9, goalDiff: -3, points: 29 },
  { position: 8, clubId: 'nacional', name: 'Nacional Potosí', played: 22, won: 7, drawn: 6, lost: 9, goalDiff: -4, points: 27 },
];

export const LINEUPS_DATA = {
  home: {
    club: BOLIVIAN_CLUBS.bolivar,
    formation: '4-3-3',
    coach: 'Flavio Robatto',
    starting: [
      { number: 1, name: 'Carlos Lampe', position: 'POR' },
      { number: 22, name: 'Yomar Rocha', position: 'DEF' },
      { number: 3, name: 'Renzo Orihuela', position: 'DEF' },
      { number: 5, name: 'José Sagredo', position: 'DEF' },
      { number: 4, name: 'Luis Paz', position: 'DEF' },
      { number: 8, name: 'Leonel Justiniano (C)', position: 'MED' },
      { number: 10, name: 'Ramiro Vaca', position: 'MED' },
      { number: 15, name: 'Fernando Saucedo', position: 'MED' },
      { number: 11, name: 'Patricio Rodríguez', position: 'DEL' },
      { number: 7, name: 'Bruno Sávio', position: 'DEL' },
      { number: 9, name: 'Fábio Gomes', position: 'DEL' },
    ]
  },
  away: {
    club: BOLIVIAN_CLUBS.strongest,
    formation: '4-2-3-1',
    coach: 'Ismael Rescalvo',
    starting: [
      { number: 13, name: 'Guillermo Viscarra', position: 'POR' },
      { number: 14, name: 'Ronald Bustos', position: 'DEF' },
      { number: 22, name: 'Adriano Jusino (C)', position: 'DEF' },
      { number: 5, name: 'Darío Aimar', position: 'DEF' },
      { number: 19, name: 'Carlos Roca', position: 'DEF' },
      { number: 8, name: 'Luciano Ursino', position: 'MED' },
      { number: 16, name: 'Álvaro Quiroga', position: 'MED' },
      { number: 10, name: 'Michael Ortega', position: 'MED' },
      { number: 20, name: 'Jaime Arrascaita', position: 'MED' },
      { number: 11, name: 'Rodrigo Ramallo', position: 'MED' },
      { number: 9, name: 'Enrique Triverio', position: 'DEL' },
    ]
  }
};

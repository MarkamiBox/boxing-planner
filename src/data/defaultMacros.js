// Default bot macros — 55 authentic boxing drills
// Step types: 'round' (work/rest/rounds/instruction), 'timer' (duration/instruction), 'sets' (reps/sets/instruction), 'text' (instruction)
// Instruction pipe '|' separates per-round notes

const defaultMacros = [
  // ═══════════════════════════════════════════════════════════════
  // 🟢 PRINCIPIANTE — Fondamentali puri
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'bot-01', type: 'timer', name: 'Shadow: Guardia allo Specchio', duration: 600, autoAdvance: true,
    instruction: 'Davanti allo specchio: mento basso, gomiti stretti ai fianchi, mani al viso (nocche all\'altezza degli zigomi). Solo 1 e 1-2 piano. Obiettivo: forma perfetta, zero potenza.',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Shadow', 'Principiante', 'Tecnica', 'Guardia']
  },
  {
    id: 'bot-02', type: 'round', name: 'Jab Tecnico al Sacco', work: 120, rest: 60, rounds: 3,
    instruction: 'Jab (1) singolo: rotazione polso, estensione completa, rientro rapido al mento | Doppio jab (1-1), stesso focus sulla forma | Jab al corpo (1B) piegando le ginocchia. Non tirare forte: mira alla precisione',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sacco', 'Principiante', 'Jab', 'Tecnica']
  },
  {
    id: 'bot-03', type: 'timer', name: 'Footwork: Passo e Scivolo', duration: 360, autoAdvance: true,
    instruction: 'Step-drag: il piede guida parte, il piede dietro segue. Mai incrociare i piedi. Avanti, indietro, destra, sinistra. Aggiungi un jab ogni 3 passi avanti.',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Footwork', 'Principiante', 'Tecnica']
  },
  {
    id: 'bot-04', type: 'round', name: 'Corda: Ritmo Base', work: 180, rest: 60, rounds: 3,
    instruction: 'Bounce step (due piedi insieme), trova il ritmo | Alterna piede destro e sinistro | Mescola i due stili. Obiettivo: non inciampare, trovare il ritmo naturale',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Corda', 'Principiante', 'Condizionamento', 'Coordinazione']
  },
  {
    id: 'bot-05', type: 'round', name: 'Combo Base: 1-2 al Sacco', work: 180, rest: 60, rounds: 3,
    instruction: 'Solo 1-2 (Jab-Cross) a media velocità, rientro mani al viso | 1-2 poi passo laterale a destra | 1-2 poi passo laterale a sinistra. Ruota le anche sul cross',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sacco', 'Principiante', 'Combinazione', 'Tecnica']
  },
  {
    id: 'bot-06', type: 'round', name: 'Difesa: Blocco Alto (Catch & Block)', work: 180, rest: 60, rounds: 2,
    instruction: 'In coppia o specchio. A tira jab, B "cattura" col guanto dx aperto senza muovere la testa. Mento basso | A tira cross, B para con mano sx. Inversione ruoli ogni 90s',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Difesa', 'Principiante', 'Tecnica', 'Parata']
  },
  {
    id: 'bot-07', type: 'timer', name: 'Stretching Pugile', duration: 480, autoAdvance: false,
    instruction: 'Spalle (braccio incrociato 30s/lato) → anche (affondo profondo 30s) → polsi (rotazioni e flessioni 30s) → collo (inclinazioni laterali 30s/lato) → flessori dell\'anca e quadricipiti (30s/lato).',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Principiante', 'Recupero', 'Stretching']
  },

  // ═══════════════════════════════════════════════════════════════
  // 🟡 BASE — Costruire il ritmo
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'bot-08', type: 'round', name: 'Shadow: Combinazioni a 3 Colpi', work: 180, rest: 60, rounds: 3,
    instruction: '1-2-3 (Jab-Cross-Gancio sx) | 1-1-2 (Doppio Jab-Cross) | Mescola le due combo con footwork. Visualizza un avversario davanti a te',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Shadow', 'Base', 'Combinazione', 'Tecnica']
  },
  {
    id: 'bot-09', type: 'round', name: 'Sacco: 1-2-3 con Movimento', work: 180, rest: 60, rounds: 4,
    instruction: '1-2-3 poi passo indietro | 1-2-3 poi pivot a sinistra | 1-2-3 poi pivot a destra | 1-2-3 poi passo a destra e jab. Non restare mai fermo dopo la combo',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sacco', 'Base', 'Combinazione', 'Footwork']
  },
  {
    id: 'bot-10', type: 'round', name: 'Sacco: Lead Hook Drill', work: 180, rest: 60, rounds: 3,
    instruction: 'Solo gancio sx (3) alla testa: braccio a 90°, rotazione completa delle anche | Solo gancio al corpo (3B), piega le ginocchia | Alternare testa e corpo (3-3B-3-3B)',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sacco', 'Base', 'Gancio', 'Potenza']
  },
  {
    id: 'bot-11', type: 'round', name: 'Difesa: Slip (Scivolata Testa)', work: 180, rest: 60, rounds: 3,
    instruction: 'Slip dx (schiva jab), slip sx (schiva cross), alternando | In coppia: A tira piano, B schiva solo col busto | Slip e risposta: slip dx → gancio sx (3)',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Difesa', 'Base', 'Slip', 'Tecnica']
  },
  {
    id: 'bot-12', type: 'round', name: 'Corda: Boxers Skip', work: 180, rest: 60, rounds: 3,
    instruction: 'Boxer skip — rimbalzo leggero alternando i piedi come corsa sul posto | Aggiungi spostamento laterale | Ultimi 30s al massimo della velocità',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Corda', 'Base', 'Condizionamento', 'Footwork']
  },
  {
    id: 'bot-13', type: 'round', name: 'Sacco: Montante Base', work: 180, rest: 60, rounds: 3,
    instruction: 'Solo montante sx (5), partendo dalle ginocchia e spingendo verso l\'alto | Solo montante dx (6) | Combo 5-6-3 (Montante sx - Montante dx - Gancio sx)',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sacco', 'Base', 'Montante', 'Tecnica']
  },
  {
    id: 'bot-14', type: 'round', name: 'Shadow: In & Out (Pendolo)', work: 180, rest: 60, rounds: 3,
    instruction: 'Pendolo in → 1-2 → pendolo out immediato | Pendolo in → 1-2-3 → pendolo out | Variare distanza: corta (gancio), media (diretto), lunga (jab) e uscire ogni volta',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Shadow', 'Base', 'Footwork', 'Distanza']
  },

  // ═══════════════════════════════════════════════════════════════
  // 🟠 INTERMEDIO — Ritmo, variazioni e difesa attiva
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'bot-15', type: 'round', name: 'Sacco: High-Low (Cambio Livello)', work: 180, rest: 60, rounds: 4,
    instruction: '1-2 alla testa poi 1B-2B al corpo | 3-2 alla testa poi 3B-2B al corpo | Mix libero alto-basso | Inizia col corpo e risali. Piega le ginocchia, non la schiena',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sacco', 'Intermedio', 'Body-work', 'Combinazione']
  },
  {
    id: 'bot-16', type: 'round', name: 'Difesa: Roll sotto il Filo', work: 180, rest: 60, rounds: 3,
    instruction: 'Tendi corda a altezza mento. Passi avanti passando sotto con "U" continua (roll) | Aggiungi gancio (3) in uscita dal roll | Combo: 1-2, roll sotto la corda, 3-2',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Difesa', 'Intermedio', 'Roll', 'Tecnica']
  },
  {
    id: 'bot-17', type: 'round', name: 'Palla Tesa: Timing e Precisione', work: 180, rest: 60, rounds: 4,
    instruction: 'Solo jab singolo, colpisci quando la palla torna verso di te | Doppio jab con ritmo 1...1 (pausa tra i due) | 1-2 preciso | Aggiungi slip dopo il 2 — la palla torna e tu fai slip',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Palla Tesa', 'Intermedio', 'Timing', 'Precisione']
  },
  {
    id: 'bot-18', type: 'round', name: 'Shadow: Contropugni', work: 180, rest: 60, rounds: 4,
    instruction: 'Visualizza jab avversario → slip esterno → cross (2) | Visualizza cross → slip interno → gancio sx (3) | Visualizza gancio sx → roll → montante dx (6) + gancio sx (3) | Reazione libera',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Shadow', 'Intermedio', 'Contrattacco', 'Difesa']
  },
  {
    id: 'bot-19', type: 'round', name: 'Sacco: Power Shots', work: 180, rest: 60, rounds: 4,
    instruction: 'Singolo cross (2) caricato al 100%, poi reset | Singolo gancio sx (3), massima rotazione anca | 1-2 veloce poi 3 caricato | Finta jab, poi cross esplosivo. Gambe, posizione, respiro tra i colpi',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sacco', 'Intermedio', 'Potenza']
  },
  {
    id: 'bot-20', type: 'round', name: 'Footwork: Pivot & Angoli', work: 180, rest: 60, rounds: 3,
    instruction: '1-2 poi perno (pivot) col piede avanti a 90° verso sinistra | 1-2 poi pivot a destra | Mix libero: attacca, pivot, riattacca da angolo diverso',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Footwork', 'Intermedio', 'Pivot', 'Ring-IQ']
  },
  {
    id: 'bot-21', type: 'round', name: 'Sacco: Raffica e Riposo', work: 180, rest: 60, rounds: 4,
    instruction: '30s ritmo 60-70% → 15s raffica esplosiva max velocità → 30s controllato → 15s raffica. Ripetere il ciclo | Stessa struttura | Stessa struttura | Stessa struttura, ultimi 15s all-out',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sacco', 'Intermedio', 'Condizionamento', 'Volume']
  },
  {
    id: 'bot-22', type: 'round', name: 'Sacco: In-Fighting', work: 180, rest: 60, rounds: 4,
    instruction: 'Testa vicina al sacco. Solo montanti corti (5-6) | Ganci corti (3-4) a cortissima distanza | Combo 5-6-3 ripetuta | Mix libero in-fighting. Sposta la testa da un lato all\'altro dopo ogni combo',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sacco', 'Intermedio', 'In-fighting', 'Tecnica']
  },
  {
    id: 'bot-23', type: 'round', name: 'Pera Veloce: Spalle e Ritmo', work: 180, rest: 60, rounds: 3,
    instruction: 'Ritmo base con mano dominante (3 rimbalzi, colpo, ripetere) | Alternare le mani | Aumenta velocità progressivamente, mani all\'altezza del naso. Le spalle devono bruciare',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Pera', 'Intermedio', 'Velocità', 'Spalle']
  },
  {
    id: 'bot-24', type: 'round', name: 'Pads: Combo + Difesa', work: 180, rest: 60, rounds: 4,
    instruction: '1-2 poi coach tira gancio da schivare (roll) | 1-2-3 poi slip su jab del coach | 1-2-5-2 poi roll su gancio | Coach chiama combo a sorpresa con difesa integrata. Mani al viso tra le combo',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Pads', 'Intermedio', 'Difesa', 'Riflessi']
  },
  {
    id: 'bot-25', type: 'round', name: 'Shadow con Pesi (0.5-1kg)', work: 180, rest: 60, rounds: 3,
    instruction: 'Solo 1-2 lento e controllato con manubri | 1-2-3-2 con manubri | Shadow libero. NON estendere il gomito a scatto — movimenti fluidi. Resistenza spalle e velocità rientro',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Shadow', 'Intermedio', 'Potenza', 'Spalle']
  },

  // ═══════════════════════════════════════════════════════════════
  // 🔴 AVANZATO — Situazioni specifiche e stress
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'bot-26', type: 'round', name: 'Sparring: Solo Jab', work: 180, rest: 60, rounds: 4,
    instruction: 'Solo jab per attaccare e parate/slip per difendere | Stessa regola, cambia approccio | Aggiungi jab al corpo (1B) | Jab e 1B. Chi colpisce senza essere toccato vince. Intensità 50-60%',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sparring', 'Avanzato', 'Jab', 'Distanza']
  },
  {
    id: 'bot-27', type: 'round', name: 'Sparring: Touch (Tecnico)', work: 180, rest: 60, rounds: 6,
    instruction: 'Solo jab e distanza | Aggiungi cross | Gancio permesso | 1-2-3 | Tutto permesso al 30% forza | Tutto permesso, focus su finte e timing. NON fare male, provare combinazioni nuove',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sparring', 'Avanzato', 'Tecnica']
  },
  {
    id: 'bot-28', type: 'round', name: 'Sacco: Body Snatcher', work: 180, rest: 60, rounds: 4,
    instruction: 'Solo gancio sx al fegato (3B), peso sulla gamba avanti | Solo gancio dx alla milza (4B) | Finta alla testa (1) → 2B pesante al plesso | Sequenza: 3B-6-3B (fegato, montante dx, fegato)',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sacco', 'Avanzato', 'Body-work', 'Potenza']
  },
  {
    id: 'bot-29', type: 'round', name: 'Difesa: Spalle alle Corde', work: 120, rest: 60, rounds: 3,
    instruction: 'Spalle alle corde/muro, partner attacca (50%). SOLO schivare, bloccare e clinch | Puoi rispondere con UN solo colpo dopo ogni difesa | Difendi e cerca l\'uscita con pivot verso l\'angolo aperto',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Difesa', 'Avanzato', 'Ring-IQ', 'Drill']
  },
  {
    id: 'bot-30', type: 'round', name: 'Sacco: Burnout Round', work: 180, rest: 30, rounds: 3,
    instruction: 'Volume altissimo 1-2-1-2-1-2 non-stop. Riposo solo 30s! | Mix ganci e montanti corti | "Shoe-shine": montanti rapidissimi a mezza altezza senza fermarsi fino al gong. Testa che si muove',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sacco', 'Avanzato', 'Resistenza', 'Condizionamento']
  },
  {
    id: 'bot-31', type: 'round', name: 'Pads: Chasing (Pressione)', work: 180, rest: 60, rounds: 4,
    instruction: 'Pad holder arretra, taglia l\'angolo con jab costante | Pad holder laterale, tu usi pivot per ricentrarti | Pad holder ti mette alle corde, esci col pivot e riattacca | Flow libero',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Pads', 'Avanzato', 'Footwork', 'Ring-IQ']
  },
  {
    id: 'bot-32', type: 'round', name: 'Shadow: Switch Stance', work: 180, rest: 60, rounds: 4,
    instruction: 'Shadow in guardia ortodossa | Shadow in guardia mancina (southpaw) | Cambia guardia ogni 30s durante la combo | Cambio guardia tattico: switch → jab del nuovo lato → switch back',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Shadow', 'Avanzato', 'Footwork', 'Tecnica']
  },
  {
    id: 'bot-33', type: 'round', name: 'Sacco: Power Pyramids', work: 180, rest: 60, rounds: 4,
    instruction: '15s pugni velocissimi a contatto leggero → 15s singoli colpi caricati 100%. Ripetere | Stessa struttura, focus su ganci | Stessa struttura, focus su montanti | Mix tutti i colpi. Passare da velocità a potenza esplosiva istantaneamente',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sacco', 'Avanzato', 'Potenza', 'Velocità']
  },
  {
    id: 'bot-34', type: 'round', name: 'Palla Tesa: Schivata e Rientro', work: 180, rest: 60, rounds: 4,
    instruction: '1-2, poi slip sulla palla che torna | 1-2, slip, rispondi col gancio (3) | Movimento continuo attorno alla palla, colpi da angoli diversi | Jab → palla torna → roll sotto → gancio d\'incontro',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Palla Tesa', 'Avanzato', 'Difesa', 'Riflessi']
  },
  {
    id: 'bot-35', type: 'round', name: 'Sacco: Combo Avanzate 5-6 Colpi', work: 180, rest: 60, rounds: 4,
    instruction: '1-2-3-2 (Jab-Cross-Gancio-Cross) | 1-2-5-2 (Jab-Cross-Montante sx-Cross) | 1-6-3-2-3 (Jab-Montante dx-Gancio-Cross-Gancio) | 1-2-3B-2-3 (Jab-Cross-Gancio corpo-Cross-Gancio testa). Fluidità delle anche',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sacco', 'Avanzato', 'Combinazione', 'Tecnica']
  },
  {
    id: 'bot-36', type: 'round', name: 'Sprints Pugilistici', work: 60, rest: 30, rounds: 6,
    instruction: 'Scatto 100% o pugni al sacco max | Stessa intensità | Stessa intensità | Stessa intensità | Stessa intensità | Ultimo round: dai tutto. Riposo solo 30s — simula fatica ultimi round',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Condizionamento', 'Avanzato', 'HIIT']
  },
  {
    id: 'bot-37', type: 'round', name: 'Sparring: Solo Corpo', work: 180, rest: 60, rounds: 4,
    instruction: 'Colpi solo sotto linea pettorali. Avvicinamento e difesa corpo coi gomiti | Stessa regola, cerca il gancio al fegato | Stessa regola, lavoro di montanti | Mix libero. Ottimo per sviluppare in-fighting senza rischio colpi alla testa',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sparring', 'Avanzato', 'Body-work', 'In-fighting']
  },
  {
    id: 'bot-38', type: 'round', name: 'Drill: Catch-and-Shoot', work: 180, rest: 60, rounds: 3,
    instruction: 'In coppia. A tira jab → B cattura con guanto dx → B risponde con cross (2) → A blocca. Ping-pong | B inizia col jab | A tira 1-2 → B para col blocco e risponde con 2-3',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Drill', 'Avanzato', 'Riflessi', 'Contrattacco']
  },
  {
    id: 'bot-39', type: 'round', name: 'Difesa: Pull Counter', work: 180, rest: 60, rounds: 3,
    instruction: 'Visualizza jab avversario → micro-passo indietro (pull back) → il pugno passa nel vuoto → cross (2) di risposta | Pull back dal cross → gancio (3) | Mix entrambi. Timing è tutto',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Difesa', 'Avanzato', 'Contrattacco', 'Distanza']
  },
  {
    id: 'bot-40', type: 'round', name: 'Sacco Leggero: Flusso Continuo', work: 180, rest: 60, rounds: 3,
    instruction: 'Pugni dritti leggeri ma continui (1-2-1-2...) senza mai fermarsi | Aggiungi ganci leggeri | Flusso totale tutti i colpi. Zero potenza, 100% velocità e ritmo. Le mani non si fermano mai',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sacco', 'Avanzato', 'Volume', 'Velocità']
  },

  // ═══════════════════════════════════════════════════════════════
  // ⚫ PRO — Simulazione match e specializzazione
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'bot-41', type: 'round', name: 'Open Sparring (Libero)', work: 180, rest: 60, rounds: 6,
    instruction: 'Riscaldamento, jab e distanza | Studio avversario, misura | Imponi il gameplan | Aumenta il ritmo | "Championship round" — tutto | Ultimo round: dai tutto, gestisci la fatica. Paradenti e caschetto obbligatori',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sparring', 'Pro', 'Gara', 'Libero']
  },
  {
    id: 'bot-42', type: 'round', name: 'Sacco: Simulazione Match', work: 180, rest: 60, rounds: 6,
    instruction: 'Piano, misura la distanza | Inizia a spingere | Raffica ultimi 30s | Continua a spingere | Fai finta di essere dietro ai punti, aumenta volume | Ultimo round: dai tutto. MUOVITI tra le combo',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sacco', 'Pro', 'Simulazione', 'Condizionamento']
  },
  {
    id: 'bot-43', type: 'round', name: 'Shadow: Finte e Trappole', work: 180, rest: 60, rounds: 4,
    instruction: 'Finta jab (muovi solo spalla), avversario reagisce, tira il vero colpo | Finta doppia → colpo vero | Passo avanti senza tirare → avversario tira → schivi e rispondi | Incorpora finte dentro combo reali',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Shadow', 'Pro', 'Finte', 'Ring-IQ']
  },
  {
    id: 'bot-44', type: 'round', name: 'Pads: Mayweather Flow', work: 180, rest: 60, rounds: 5,
    instruction: 'Pull counter dal jab → cross risposta | Shoulder roll dal cross → gancio risposta | Combo ritmiche sincopate (1...2-3) | Check hook: passo indietro + gancio | Flow libero con coach. Focus su RITMO, non velocità',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Pads', 'Pro', 'Contrattacco', 'Flow']
  },
  {
    id: 'bot-45', type: 'round', name: 'Sparring: Solo Contrattacco', work: 180, rest: 60, rounds: 4,
    instruction: 'Un pugile SOLO risponde, mai inizia. Aspetta il colpo, schiva/blocca, rispondi con combo precisa | Stessa regola | Inversione ruoli | Inversione ruoli. Intensità 40-50%',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sparring', 'Pro', 'Contrattacco', 'Drill']
  },
  {
    id: 'bot-46', type: 'round', name: 'Sacco: Shoe-Shine (Mitraglia)', work: 120, rest: 60, rounds: 3,
    instruction: 'Montanti rapidissimi alternati (5-6-5-6...) a mezza altezza senza pause per 2 min | Aggiungi un gancio (3) ogni 8 montanti | Termina ogni raffica con gancio o cross caricato. Non fermarti MAI fino al gong',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sacco', 'Pro', 'Volume', 'In-fighting']
  },
  {
    id: 'bot-47', type: 'round', name: 'Drill: Clinch Fighting', work: 120, rest: 60, rounds: 3,
    instruction: 'Posizione clinch (spalla a spalla): overhook/underhook, cerca posizione dominante | Dalla clinch libera una mano e tira montanti corti (5 o 6) | Entra in clinch → 2 montanti → spingi fuori → cross lungo',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sparring', 'Pro', 'In-fighting', 'Clinch']
  },
  {
    id: 'bot-48', type: 'round', name: 'Difesa: Philly Shell / Shoulder Roll', work: 180, rest: 60, rounds: 3,
    instruction: 'Posizione Philly Shell (mano avanti bassa, spalla alta come scudo). Roll della spalla vs jab e cross immaginari | Roll → cross di risposta | Roll → pull back → lead hook. Serve ottima base di footwork',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Difesa', 'Pro', 'Tecnica', 'Contrattacco']
  },
  {
    id: 'bot-49', type: 'round', name: 'Sacco: Walk-Down (Stile Messicano)', work: 180, rest: 60, rounds: 4,
    instruction: 'Cammina verso il sacco con jab costante, testa che si muove, mai in linea retta | Arrivato al sacco scarica combo corpo-testa (3B-3-2) | Sacco oscilla, inseguilo e "intrappolalo" al muro | Full pressure senza sosta',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Sacco', 'Pro', 'Pressione', 'In-fighting']
  },
  {
    id: 'bot-50', type: 'round', name: 'Shadow: Simulazione Match 3x3', work: 180, rest: 60, rounds: 3,
    instruction: 'Studio avversario immaginario, jab costante, cerca la distanza | Implementa il gameplan: out-boxer=jab e angoli, in-fighter=accorcia e corpo | Ultimo round è il tuo: dai tutto come in gara vera',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Shadow', 'Pro', 'Simulazione', 'Gara']
  },

  // ═══════════════════════════════════════════════════════════════
  // ⚡ CONDIZIONAMENTO & RECUPERO SPECIFICO
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'bot-51', type: 'timer', name: 'Roadwork: Corsa Intervallata', duration: 1800, autoAdvance: true,
    instruction: '5 min corsa lenta riscaldamento. Poi ogni 3 min (come un round): 30s sprint 100%. Nei restanti 2m30s corri a ritmo costante. Ultimi 5 min: cooldown lento. Totale: ~8 "round" di sprint.',
    _isDefault: true, parentType: 'Running',
    tags: ['Bot', 'Condizionamento', 'Roadwork', 'HIIT']
  },
  {
    id: 'bot-52', type: 'sets', name: 'Core: Anti-Rotazione Pugile', reps: 12, sets: 3,
    instruction: 'Set 1: Pallof Press (o elastico) — 12 reps/lato. Resisti alla rotazione. Set 2: Russian twist con palla medica 3-5kg — 12 reps/lato. Set 3: Plank laterale con rotazione — 12 reps/lato.',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Core', 'Condizionamento', 'Potenza']
  },
  {
    id: 'bot-53', type: 'sets', name: 'Rinforzo Collo (Neck Conditioning)', reps: 15, sets: 4,
    instruction: 'Set 1: Flessione collo (avanti) con resistenza manuale o asciugamano. Set 2: Estensione (indietro). Set 3: Laterale destra. Set 4: Laterale sinistra. 15 reps lente. Non pesi pesanti. Questo muscolo ti salva dai KO.',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Condizionamento', 'Prevenzione', 'Collo']
  },
  {
    id: 'bot-54', type: 'round', name: 'Corda: Death Round (Sfida)', work: 180, rest: 0, rounds: 1,
    instruction: 'Un singolo round al massimo della velocità. Conta quanti salti fai in 3 min. Se inciampi riparti subito. Scrivi il numero nelle note per tracciare il progresso settimanale',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Corda', 'Condizionamento', 'Sfida']
  },
  {
    id: 'bot-55', type: 'timer', name: 'Riscaldamento Dinamico Pugile', duration: 600, autoAdvance: true,
    instruction: 'Cerchi braccia (30s) → Rotazioni busto (30s) → Affondi camminati (1min) → Ginocchia alte (1min) → Calci al sedere (1min) → Shadow leggero mobilità spalle (3min) → Rotazioni polsi (30s) → Neck rolls leggeri (30s).',
    _isDefault: true, parentType: 'Boxing',
    tags: ['Bot', 'Riscaldamento', 'Principiante', 'Mobilità']
  }
];

export default defaultMacros;

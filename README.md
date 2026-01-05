<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Nexo Royale · Manual del proyecto

Simulador táctico en tiempo real construido con React y Vite. El jugador organiza un mazo de 8 unidades, lanza hechizos y despliega tropas en un campo de batalla dividido por puentes mientras la IA adapta su estrategia según tus patrones de juego. No requiere claves externas ni servicios de terceros: todo corre localmente.

## Cómo ejecutar el proyecto

1. **Instala dependencias:** `npm install`
2. **Inicia el entorno de desarrollo:** `npm run dev` (abre `http://localhost:3000`)
3. **Build de producción (opcional):** `npm run build`
4. **Validación de datos y tipos:** `npm run lint` (revisa `CARD_LIBRARY`, tipos y scripts con TypeScript)

## Flujo de juego

- El jugador y la IA generan energía de forma constante (con aceleración al entrar en tiempo extra).  
- Gana quien destruya más torres; si el tiempo se agota sin desempate se activa una “muerte súbita” con extensión temporal y reglas de desempate por daño recibido.  
- Cada facción (Humanos, Androides, Alienígenas con subtipos) aporta unidades terrestres, aéreas, estructuras y hechizos con formas y efectos visuales diferenciados.  
- Las habilidades de comandante (EMP, Nido Arácnido, Comando de la Nave Nodriza) añaden micro-estrategias con costes, radios y enfriamientos propios.

## Componentes y clases principales

### Frontend (React)
- **`App.tsx`**: orquesta el estado global, controla la energía, invocación de unidades, temporizadores de habilidades, estados de arena y manejo de arrastrar/soltar para desplegar cartas. Intermedia entre UI y motor (`GameLoop`, IA, habilidades).  
- **`components/Arena.tsx`**: renderiza el campo de batalla en `<canvas>`, dibuja unidades, torres, proyectiles y efectos (glitches de tiempo extra, indicadores de rango) y reporta los límites del lienzo para validar despliegues.  
- **`components/DeckEditor.tsx`**: editor del mazo de 8 cartas con estadísticas agregadas (coste medio, recuento por tipo), panel de configuración de habilidad especial y prevención de cierres hasta cumplir el tamaño de mazo.  
- **`components/Codex.tsx`**: catálogo filtrable/ordenable de cartas jugables con resumen de atributos, coste y descripciones de sabor.  
- **`components/CardPreview.tsx`**: miniatura reusada en el mazo y los overlays para mostrar color, facción, puntos de vida, daño, alcance y cadencia.  
- **`components/SpecialAbilityModal.tsx`**: modal configurable para las habilidades de comandante (modos EMP, hangar de la nave nodriza, variante de arañas del nido).  
- **`components/OverlayPortal.tsx`**: capa portalizada para superposiciones (editor, modales) manteniendo la UI principal limpia.

### Motor de juego (`engine/`)
- **`GameLoop.ts`**: actualiza el estado en cada tick (energía, colisiones, daño, curación, estado de torres, temporizadores, efectos visuales y hechizos activos/persistentes). Gestiona estados especiales como *overtime_glitch* y *sudden_death* y determina condiciones de victoria.  
- **`AI.ts` (NexoAI)**: IA adaptable que observa patrones del jugador (carril usado, unidades aéreas, enjambres, tanques, agresividad) y decide cartas o habilidades según recursos, amenazas y dificultad.  
- **`abilities/emp.ts`**: aplica modos de pulso EMP (apagón total vs. disrupción) con distintos radios, aturdimientos y daños, además de generar efectos visuales.  
- **`abilities/mothership.ts`**: controla la Nave Nodriza (spawn, cooldown, carga de hangar configurable y generación de refuerzos periódicos).  
- **`abilities/aracno.ts`**: gestiona el Nido Arácnido y los modos de arañas (letal, curativa, kamikaze) incluyendo decaimiento del nido y temporizadores de aparición.  
- **`audio.ts`**: reproduce efectos de sonido contextualizados según facción, estilo de proyectil, subfacción y tipo de ataque.  
- **`MusicConductor.ts`**: genera pistas procedimentales (clímax de 3 minutos o meditación de 5 minutos) sincronizadas con la duración de la partida y variaciones de tensión.

### Datos y utilidades
- **`constants.ts`**: biblioteca completa de cartas (`CARD_LIBRARY` y `PLAYABLE_CARD_LIBRARY`), distribución de facciones/roles, parámetros de arena, habilidades especiales y valores de equilibrio (energía, enfriamientos, daños, radios).  
- **`types.ts`**: define enumeraciones y estructuras principales (equipos, unidades, torres, proyectiles, efectos, hechizos y configuraciones de habilidades).  
- **`scripts/validate-card-library.ts`**: script de linteo que asegura el reparto mínimo de cartas por facción/subtipo, evita duplicados y valida roles por grupo.  
- **`constants.ts` + `types.ts`**: describen el esquema de diseño de mazo (50 cartas distribuidas en 5 grupos con slots fijos de melee/tiradores/tanque/estructuras/hechizos).

## Guía rápida de juego

1. **Arma tu mazo:** abre el “Centro de Armamento” y selecciona 8 cartas; revisa coste medio y equilibrio de tipos. Configura la habilidad de comandante (modo EMP, hangar de la nodriza o modo del nido arácnido).  
2. **Despliega con arrastrar/soltar:** selecciona una carta de la mano y suéltala en la mitad del mapa que te corresponda; las cartas de hechizo muestran un área de efecto previa.  
3. **Controla la economía:** la energía se regenera lentamente (doble velocidad en tiempo extra). Gasta con antelación para no alcanzar el límite máximo y aprovechar ventanas de presión.  
4. **Usa la habilidad a tiempo:** las habilidades tienen coste y enfriamiento; el EMP detiene pushes, la nave nodriza monta ofensivas sostenidas y el nido arácnido controla zona con arañas temáticas.  
5. **Lee las señales del campo:** la arena muestra glitches en tiempo extra, indicadores de colisión, proyectiles y zonas de curación/veneno para facilitar decisiones tácticas.

## Diseño de cartas

El mazo total se estructura con 50 espacios distribuidos equitativamente entre cinco facciones/grupos:

- **Humanos** (10 slots)
- **Androides** (10 slots)
- **Alien Humanoide** (10 slots)
- **Alien Arácnido** (10 slots)
- **Alien Slimoide** (10 slots)

Cada grupo reserva los mismos roles para sus 10 cartas:

- 3 cartas **melee**
- 2 cartas **tiradores**
- 1 carta **tanque**
- 2 cartas **estructuras**
- 2 cartas **hechizos**

Esta distribución fija mantiene la paridad entre facciones y facilita definir atributos específicos (facción y subtipo alienígena) en las cartas individuales.

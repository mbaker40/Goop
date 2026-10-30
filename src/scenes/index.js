/* The six dioramas. back() is the painted backdrop (no outlines); mid() and front() are cutouts either
   side of the goop. Each stage lives in its own file so new stages can be added one file at a time. */
import table from './1-table.js';
import lab from './2-lab.js';
import downtown from './3-downtown.js';
import orbit from './4-orbit.js';
import planet from './5-planet.js';
import sun from './6-sun.js';

export const SCENES = [table, lab, downtown, orbit, planet, sun];

/* The twenty dioramas. back() is the painted backdrop (no outlines); mid() and front() are cutouts either
   side of the goop. Each stage lives in its own file so new stages can be added one file at a time. */
import table from './1-table.js';
import lab from './2-lab.js';
import downtown from './3-downtown.js';
import orbit from './4-orbit.js';
import planet from './5-planet.js';
import sun from './6-sun.js';
import neighbours from './7-neighbours.js';
import nebula from './8-nebula.js';
import blackhole from './9-blackhole.js';
import milkyway from './10-milkyway.js';
import andromeda from './11-andromeda.js';
import potluck from './12-potluck.js';
import virgo from './13-virgo.js';
import laniakea from './14-laniakea.js';
import cosmicweb from './15-cosmicweb.js';
import nothing from './16-nothing.js';
import observable from './17-observable.js';
import horizon from './18-horizon.js';
import darkmenu from './19-darkmenu.js';
import fourthwall from './20-fourthwall.js';

export const SCENES = [table, lab, downtown, orbit, planet, sun, neighbours, nebula, blackhole, milkyway, andromeda, potluck, virgo, laniakea, cosmicweb, nothing, observable, horizon, darkmenu, fourthwall];

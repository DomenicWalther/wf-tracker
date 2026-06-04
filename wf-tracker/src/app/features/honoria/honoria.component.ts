import { Component, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';

interface HonoriaItem {
  id: string;
  name: string;
  location: string;
}

interface HonoriaSection {
  id: string;
  title: string;
  items: HonoriaItem[];
}

const STORAGE_KEY = 'wft_honoria';

function makeId(section: string, name: string): string {
  return `${section}::${name}`;
}

const SECTIONS: HonoriaSection[] = [
  {
    id: 'roathe',
    title: 'Purchased from Roathe',
    items: [
      { id: '', name: 'Abyssal Thorn',                      location: '75 Vainthorn' },
      { id: '', name: 'Along Came',                         location: '100 Scuttler Husk' },
      { id: '', name: 'Big Spender',                        location: '100,000 Credits' },
      { id: '', name: 'Bigger Spender',                     location: '1,000,000 Credits' },
      { id: '', name: 'Biggest Spender',                    location: '2,500,000 Credits' },
      { id: '', name: 'Blazing Revolutionary',              location: '150 Beating Heartstrings' },
      { id: '', name: 'Conscience Painter',                 location: '1,000 Atramentum' },
      { id: '', name: 'Demoness',                           location: '20 Maphica' },
      { id: '', name: 'Early Lunch for',                    location: '100 Goopolla Spleen' },
      { id: '', name: 'Fatuous Nymph',                      location: '100 Heart Noctrul' },
      { id: '', name: 'Fire and Brimstone',                 location: '1,000 Ignia' },
      { id: '', name: 'Forever',                            location: '20 Argon Crystal' },
      { id: '', name: 'Gyanburā',                           location: '150 Fate Pearl' },
      { id: '', name: 'Heart of Concrete',                  location: '470 Stela' },
      { id: '', name: 'Hive-kin',                           location: '20 Ascaris Prime' },
      { id: '', name: 'Hot Sludge',                         location: '200 Thermal Sludge' },
      { id: '', name: 'Ironclad',                           location: '400,000 Ferrite' },
      { id: '', name: "Jade's Guardian",                    location: '200 Vestigial Motes' },
      { id: '', name: 'Kaithe Tamer of Duviri',             location: '100 Yao Shrub' },
      { id: '', name: 'Lamenting One',                      location: '200 Lamentus' },
      { id: '', name: 'Marauder of the Deep',               location: '310 Fish Meat' },
      { id: '', name: 'Matriarch',                          location: '500 Mother Token' },
      { id: '', name: 'Matron of Malaise',                  location: '250 Judgement Points' },
      { id: '', name: 'Mayor of Corpus City',               location: '2,000 Hexenon' },
      { id: '', name: 'Night Gardener',                     location: '150 Fergolyte' },
      { id: '', name: "Oblivion's Kiss",                    location: '2,600 Höllvanian Pitchweave Fragment' },
      { id: '', name: 'On That Far Shore Forlorn',          location: '10 Lyroic Bridge' },
      { id: '', name: 'Orokin Cell Executor',               location: '150 Orokin Cell' },
      { id: '', name: 'Patriarch',                          location: '75 Father Token' },
      { id: '', name: 'Payer of the Ferryman',              location: '100,000 Entrati Obols' },
      { id: '', name: 'Saint of Altra',                     location: '110 Sentirum' },
      { id: '', name: 'Sentinel of Passion',                location: '200 Belric Crystal Fragment + 200 Rania Crystal Fragment' },
      { id: '', name: 'Spore Bearer',                       location: '500,000 Nano Spores' },
      { id: '', name: 'Steel Soldier',                      location: '200 Steel Essence' },
      { id: '', name: 'Sworn Sister',                       location: '50 Spectral Debris' },
      { id: '', name: 'The Copper Kid',                     location: '200 Coprun' },
      { id: '', name: 'The God Above Knowledge',            location: '10 Echo Voca' },
      { id: '', name: 'The Heir of Two Kingdoms',           location: '50 Narmer Isoplast' },
      { id: '', name: 'The Invincible',                     location: '50 Pulsating Tubercles + 50 Infected Palpators + 50 Chitinous Husk + 50 Severed Bile Sac' },
      { id: '', name: 'The Learned',                        location: '150 Vessel Capillaries' },
      { id: '', name: 'The Mad King',                       location: '1,000 Thrax Plasm' },
      { id: '', name: 'The Maniac of Deimos',               location: '1,000 Ganglion' },
      { id: '', name: 'The Navigator',                      location: '1,000 Nav Coordinate' },
      { id: '', name: 'The Persecuted',                     location: "40 Kullervo's Bane" },
      { id: '', name: 'The Power of Harrow Compels Thee',   location: '250 Harrow Chassis Blueprints' },
      { id: '', name: 'The Scarlet Queen',                  location: '130 Amarast' },
      { id: '', name: 'The Scavenger',                      location: '600,000 Salvage' },
      { id: '', name: 'The Sunderer',                       location: '200 Riven Sliver' },
      { id: '', name: 'The Warden of Alchemy',              location: '110 Xenorhast' },
      { id: '', name: "Ticker's Angel",                     location: '100 Familial Debt-Bond' },
      { id: '', name: 'Voyager',                            location: '5,000 Asterite' },
      { id: '', name: 'Who Devours All',                    location: '110 Common Condroc Tag' },
      { id: '', name: 'Wolfmother',                         location: '150 Lua Thrax Plasm' },
      { id: '', name: 'Yuvan Rising',                       location: '100,000 Kuva' },
    ],
  },
  {
    id: 'syndicates-factions',
    title: 'Syndicates — Factions',
    items: [
      { id: '', name: 'Seeker of Truth',        location: 'Arbiters of Hexis — Rank 5, 5,000 Standing' },
      { id: '', name: 'Thirst for Knowledge',   location: 'Cephalon Suda — Rank 5, 5,000 Standing' },
      { id: '', name: 'Defender of the Earth',  location: 'New Loka — Rank 5, 5,000 Standing' },
      { id: '', name: 'Diplomatic Merchant',    location: 'Perrin Sequence — Rank 5, 5,000 Standing' },
      { id: '', name: 'Eradicator of Corruption', location: 'Red Veil — Rank 5, 5,000 Standing' },
      { id: '', name: 'Liberated Grineer',      location: 'Steel Meridian — Rank 5, 5,000 Standing' },
    ],
  },
  {
    id: 'syndicates-kim',
    title: 'Syndicates — Kinemantik Instant Messenger',
    items: [
      { id: '', name: 'The Lover',          location: 'Begin relationship with Protoframe' },
      { id: '', name: 'Heart Shot',         location: 'Begin relationship with Quincy' },
      { id: '', name: 'l33t h4XX0r',        location: 'Begin relationship with Amir' },
      { id: '', name: 'Once and Future',    location: 'Begin relationship with Arthur' },
      { id: '', name: 'Paper Crane',        location: 'Begin relationship with Aoi' },
      { id: '', name: 'Silver Tongue',      location: 'Begin relationship with Eleanor' },
      { id: '', name: 'Pleasure and Pain',  location: 'Begin relationship with Leticia' },
      { id: '', name: "Rusalka's Hope",     location: 'Rekindle love between Minerva and Velimir' },
      { id: '', name: 'Soulmate',           location: 'Begin relationship with Lyon' },
      { id: '', name: 'Cœur Enflammé',     location: 'Begin relationship with Marie' },
      { id: '', name: "Devil's Own",        location: 'Begin relationship with Roathe' },
      { id: '', name: "The Devil's Confessor", location: "Listen to all 21 of Roathe's Trauma logs" },
    ],
  },
  {
    id: 'adversary-vanquish',
    title: 'Adversary System — Vanquishing',
    items: [
      { id: '', name: 'of the Old Blood',   location: 'Vanquish Kuva Lich' },
      { id: '', name: 'Executive Overrider', location: 'Vanquish Sister of Parvos' },
      { id: '', name: 'On-lyne Fan',         location: 'Vanquish Technocyte Coda' },
    ],
  },
  {
    id: 'adversary-weapons',
    title: 'Adversary System — Weapons',
    items: [
      { id: '', name: 'Sleeping in the Cold Below', location: 'Max Rank 5 Tenet Weapons' },
      { id: '', name: 'On-Lyne Superfan',            location: 'Max Rank 5 Coda Weapons' },
      { id: '', name: 'Worm Queen',                  location: 'Max Rank 5 Kuva Weapons' },
    ],
  },
  {
    id: 'quests',
    title: 'Quests',
    items: [
      { id: '', name: 'Awoken Tenno',           location: 'Complete The Second Dream' },
      { id: '', name: 'Champion of the Lotus',  location: 'Complete The Lotus Eaters' },
      { id: '', name: 'Clem',                   location: 'Complete A Man of Few Words' },
      { id: '', name: 'Drifter',                location: 'Complete The New War' },
      { id: '', name: 'The Great & Terrible',   location: 'Complete Jade Shadows' },
      { id: '', name: 'Chosen of Margulis',     location: 'Complete The Old Peace' },
    ],
  },
  {
    id: 'descendia',
    title: 'The Descendia',
    items: [
      { id: '', name: 'Facilis Descensus Averno', location: 'Complete all 21 Steel Path Descendia floors solo without dying' },
      { id: '', name: 'Exorcist',                  location: 'Defeat Roathe in Descendia 21 times' },
      { id: '', name: 'Divine Comedian',            location: 'Complete all 21 Descendia floors as Dante' },
      { id: '', name: "Harrow's Shadow",            location: 'Complete all 21 Descendia floors as Harrow' },
      { id: '', name: 'Double Trouble',             location: 'Complete all 21 Descendia floors as Uriel' },
      { id: '', name: 'Pas de Deux',                location: 'Complete all 21 Descendia floors as Wisp' },
      { id: '', name: "Lyon's Savior",              location: 'Defend Lyon in Descendia 3 times' },
      { id: '', name: "Marie's Champion",           location: 'Defend Marie in Descendia 3 times' },
    ],
  },
  {
    id: 'perita',
    title: 'The Perita Rebellion',
    items: [
      { id: '', name: 'Hotwired',              location: 'Steal 20 Anarch Shuttles' },
      { id: '', name: 'Jammer',                location: 'Destroy 50 communication relays' },
      { id: '', name: 'Minesweeper',           location: 'Locate and defuse 81 buried mines' },
      { id: '', name: 'Friend of Sentients',   location: 'Deliver 100 Energy Cores to Typholysts' },
      { id: '', name: 'Under Friendly Fire',   location: 'Vanquish Hunhullus 5 times' },
    ],
  },
  {
    id: 'follies-hunt',
    title: "Follie's Hunt",
    items: [
      { id: '', name: 'Painted Free',          location: "Complete Follie's Hunt once" },
      { id: '', name: 'Shadowgrapher',          location: "Complete Follie's Hunt ten times" },
      { id: '', name: 'Arbiter of Ink',         location: 'Help Aspirant Zorba read all five Master Kozai letters' },
    ],
  },
  {
    id: 'hardmode-bosses',
    title: 'Hardmode Bosses',
    items: [
      { id: '', name: 'My Light Goes With You', location: 'Clear The Guilty' },
      { id: '', name: 'Fragmented',             location: 'Collect all 6 Accolade Glyphs from The Fragmented One' },
      { id: '', name: 'Savior of Perita',       location: 'Collect all 6 Accolade Glyphs from The Guilty' },
      { id: '', name: 'The Mechanic',           location: 'Collect all 6 Accolade Glyphs from H-09 Apex' },
      { id: '', name: 'The Void Called to Me',  location: 'Collect all 6 Accolade Glyphs from Janus Captain Vor' },
    ],
  },
  {
    id: 'focus-represent',
    title: 'Focus — Represent',
    items: [
      { id: '', name: 'Madurai Vanguard',  location: '5,000,000 Focus (Madurai)' },
      { id: '', name: 'Naramon Vanguard',  location: '5,000,000 Focus (Naramon)' },
      { id: '', name: 'Unairu Vanguard',   location: '5,000,000 Focus (Unairu)' },
      { id: '', name: 'Vazarin Vanguard',  location: '5,000,000 Focus (Vazarin)' },
      { id: '', name: 'Zenurik Vanguard',  location: '5,000,000 Focus (Zenurik)' },
    ],
  },
  {
    id: 'focus-tektolyst',
    title: 'Focus — Tektolyst Artifacts',
    items: [
      { id: '', name: 'Storm Archer',    location: 'Obtain Thara (Madurai Bow)' },
      { id: '', name: 'Swordmaster',     location: 'Obtain Vexoric (Naramon Sword)' },
      { id: '', name: 'Mountain Soul',   location: 'Obtain Cogron (Unairu Hammer)' },
      { id: '', name: 'Staffbearer',     location: 'Obtain Nidri (Vazarin Staff)' },
      { id: '', name: 'Scholar of Secrets', location: 'Obtain Lorak (Zenurik Grimoire)' },
    ],
  },
  {
    id: 'mastery',
    title: 'Account Milestones — Mastery Rank',
    items: [
      { id: '', name: 'Initiate',    location: 'Mastery Rank 1' },
      { id: '', name: 'Novice',      location: 'Mastery Rank 4' },
      { id: '', name: 'Disciple',    location: 'Mastery Rank 7' },
      { id: '', name: 'Seeker',      location: 'Mastery Rank 10' },
      { id: '', name: 'Hunter',      location: 'Mastery Rank 13' },
      { id: '', name: 'Eagle',       location: 'Mastery Rank 16' },
      { id: '', name: 'Tiger',       location: 'Mastery Rank 19' },
      { id: '', name: 'Dragon',      location: 'Mastery Rank 22' },
      { id: '', name: 'Sage',        location: 'Mastery Rank 25' },
      { id: '', name: 'Master',      location: 'Mastery Rank 28' },
      { id: '', name: 'True Master', location: 'Mastery Rank 30' },
    ],
  },
  {
    id: 'insign',
    title: 'Insign Pack',
    items: [
      { id: '', name: 'Insign',    location: 'Purchase Insign Pack' },
      { id: '', name: 'Servio',    location: 'Complete Servio V Sporoi challenge' },
      { id: '', name: 'Tenens',    location: 'Complete Tenens IX Sporoi challenge' },
      { id: '', name: 'Capit',     location: 'Complete Capit XIII Sporoi challenge' },
      { id: '', name: 'Grandis',   location: 'Complete Grandis XVII Sporoi challenge' },
      { id: '', name: 'Perigone',  location: 'Complete Grandis XX Perigone challenge' },
    ],
  },
  {
    id: 'prime',
    title: 'Prime Warframes',
    items: [
      { id: '', name: 'Messenger of Long Forgotten Gods', location: 'Acquire Gauss Prime' },
      { id: '', name: 'The Gallant Gourmand',             location: 'Acquire Grendel Prime' },
      { id: '', name: 'Heart of the Pack',                location: 'Acquire Voruna Prime' },
    ],
  },
  {
    id: 'other',
    title: 'Other',
    items: [
      { id: '', name: 'Ack-Ack',                  location: 'Destroy 30 airborne units from ground' },
      { id: '', name: 'Historian of Tau',          location: 'Complete History of Tau sequence' },
      { id: '', name: "Kalymos's Best Friend",     location: 'Interact with Kalymos in Backroom' },
      { id: '', name: 'Legendary Captain',         location: 'Raise all Railjack Intrinsics to Rank 10' },
      { id: '', name: "Oraxia's Prey",             location: 'Vanquish Oraxia in Isleweaver' },
      { id: '', name: 'Sticker Master',            location: 'Collect every Peely Pix from Temporal Archimedea' },
      { id: '', name: 'Tenno of a Thousand Days',  location: 'Log in for 1,000 days' },
      { id: '', name: 'The Arcanist',              location: 'Get 20 Arcanes to Max Rank' },
    ],
  },
  {
    id: 'events',
    title: 'Events',
    items: [
      { id: '', name: 'Of Golden Valor',    location: '80 Marks of Valiance (Operation: Blood of Perita)' },
      { id: '', name: 'Shadow Conservator', location: '200 Nightmare Tatters (Operation: Atramentum)' },
      { id: '', name: 'Volatile Mote',      location: '100 Volatile Motes (Operation: Belly of the Beast)' },
    ],
  },
];

// Assign stable IDs once
for (const sec of SECTIONS) {
  for (const item of sec.items) {
    item.id = makeId(sec.id, item.name);
  }
}

@Component({
  selector: 'app-honoria',
  imports: [SectionHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="HONORIA"
        description="Track every Honoria title available in Warframe. Check off the ones you've earned."
        [completed]="totalCompleted()"
        [total]="totalItems"
      />

      @for (section of sections; track section.id) {
        <section class="hon-section" [attr.aria-labelledby]="section.id + '-heading'">

          <div class="section-header">
            <div class="section-title-row">
              <h2 class="section-title" [id]="section.id + '-heading'">{{ section.title }}</h2>
              <div class="section-actions">
                <span class="section-count">{{ sectionCompleted(section) }}/{{ section.items.length }}</span>
                <button
                  class="check-all-btn"
                  type="button"
                  (click)="checkAll(section)"
                  [attr.aria-label]="'Check all in ' + section.title"
                >Check All</button>
              </div>
            </div>
            <div class="progress-bar-bg" role="progressbar"
                 [attr.aria-valuenow]="sectionCompleted(section)"
                 [attr.aria-valuemax]="section.items.length"
                 [attr.aria-label]="section.title + ' progress'">
              <div class="progress-bar-fill" [style.width.%]="sectionPct(section)"></div>
            </div>
          </div>

          <ul class="item-list" role="list">
            @for (item of section.items; track item.id) {
              <li class="item-row" [class.item-done]="isChecked(item.id)">
                <label class="item-label">
                  <input
                    type="checkbox"
                    class="item-checkbox"
                    [checked]="isChecked(item.id)"
                    (change)="toggle(item.id)"
                    [attr.aria-label]="item.name"
                  />
                  <span class="item-name">{{ item.name }}</span>
                  <span class="item-location">{{ item.location }}</span>
                </label>
              </li>
            }
          </ul>

        </section>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 860px; }

    .hon-section {
      margin-bottom: 24px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      overflow: hidden;
    }

    .section-header {
      padding: 10px 16px;
      background: var(--color-surface2);
      border-bottom: 1px solid var(--color-border);
    }

    .section-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 6px;
    }

    .section-title {
      margin: 0;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--color-gold);
    }

    .section-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .section-count {
      font-size: 11px;
      color: var(--color-text-muted);
    }

    .check-all-btn {
      background: none;
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      font-size: 11px;
      padding: 2px 10px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .check-all-btn:hover { border-color: var(--color-gold); color: var(--color-gold); }

    .progress-bar-bg {
      height: 3px;
      background: var(--color-border);
      border-radius: 2px;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      background: var(--color-gold);
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    .item-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .item-row {
      display: flex;
      align-items: center;
      border-bottom: 1px solid var(--color-border);
      transition: background 0.1s;
    }

    .item-row:last-child { border-bottom: none; }
    .item-row:hover { background: var(--color-surface2); }
    .item-row.item-done { opacity: 0.45; }

    .item-label {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 6px 10px;
      padding: 9px 14px;
      cursor: pointer;
      flex: 1;
    }

    .item-checkbox {
      flex-shrink: 0;
      accent-color: var(--color-gold);
      width: 14px;
      height: 14px;
      cursor: pointer;
      align-self: center;
    }

    .item-name {
      font-size: 13px;
      color: var(--color-text);
      font-weight: 500;
    }

    .item-done .item-name {
      text-decoration: line-through;
      color: var(--color-text-muted);
    }

    .item-location {
      font-size: 11px;
      color: var(--color-text-muted);
      opacity: 0.8;
    }
  `],
})
export class HonoriaComponent {
  readonly sections = SECTIONS;
  readonly totalItems = SECTIONS.reduce((sum, s) => sum + s.items.length, 0);

  private readonly checked = signal<Set<string>>(this.loadChecked());

  readonly totalCompleted = computed(() => this.checked().size);

  isChecked(id: string): boolean {
    return this.checked().has(id);
  }

  toggle(id: string): void {
    this.checked.update(set => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  sectionCompleted(section: HonoriaSection): number {
    const set = this.checked();
    return section.items.filter(i => set.has(i.id)).length;
  }

  checkAll(section: HonoriaSection): void {
    this.checked.update(set => {
      const next = new Set(set);
      for (const item of section.items) next.add(item.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  sectionPct(section: HonoriaSection): number {
    return section.items.length > 0
      ? (this.sectionCompleted(section) / section.items.length) * 100
      : 0;
  }

  private loadChecked(): Set<string> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  }
}
